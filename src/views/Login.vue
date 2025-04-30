<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <img src="../assets/vue.svg" alt="Logo" class="logo">
        <h2>班级考勤系统</h2>
      </div>
      
      <div class="camera-container" v-if="showCamera">
        <div v-if="isLoading" class="loading-overlay">
          <el-progress type="circle" :percentage="loadingProgress" />
          <p>{{ loadingStatus }}</p>
        </div>
        <video ref="videoRef" class="camera-preview" autoplay muted></video>
        <canvas ref="canvasRef" class="face-canvas"></canvas>
        <div class="camera-overlay">
          <p class="detection-status">{{ detectionStatus }}</p>
          <el-button type="success" :icon="VideoCamera" @click="startLivenessDetection" 
            :loading="isDetecting" :disabled="isLoading">
            {{ isDetecting ? '正在检测' : '开始活体检测' }}
          </el-button>
          <el-button type="default" @click="toggleCamera" :disabled="isDetecting">
            返回
          </el-button>
        </div>
      </div>

      <div v-if="!showCamera">
        <el-form :model="loginForm" :rules="rules" ref="loginFormRef">
          <el-form-item prop="role">
            <el-select v-model="loginForm.role" placeholder="请选择角色" class="w-full">
              <el-option label="教师" value="teacher" />
              <el-option label="学生" value="student" />
            </el-select>
          </el-form-item>

          <el-form-item prop="username">
            <el-input 
              v-model="loginForm.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input 
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" class="w-full" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-options">
          <el-button type="success" link @click="toggleCamera">
            使用人脸识别登录
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { User, Lock, VideoCamera } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import * as faceapi from 'face-api.js'
import { faceService } from '../services/FaceService'
import { useRouter } from 'vue-router'

const router = useRouter()

const loginFormRef = ref<FormInstance>()
const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const showCamera = ref(false)
const isDetecting = ref(false)
const detectionStatus = ref('')
const blinkCount = ref(0)
const lastEyeState = ref<'open' | 'closed'>('open')
const isLoading = ref(true)
const loadingProgress = ref(0)
const loadingStatus = ref('')

const loginForm = reactive({
  role: '',
  username: '',
  password: ''
})

const rules = {
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid, fields) => {
    if (valid) {
      try {
        // 示例：假设用户名 admin 密码 123456 为合法
        if (loginForm.username === 'admin' && loginForm.password === '123456') {
          ElMessage.success('登录成功')
          console.log('跳转前', loginForm)
          localStorage.setItem('isAuthenticated', 'true')
          await router.push('/dashboard') // 确保你的路由中有该页面
          console.log('已尝试跳转')
        } else {
          ElMessage.error('用户名或密码错误')
        }
      } catch (error) {
        ElMessage.error('登录异常')
      }
    }
  })
}


const toggleCamera = async () => {
  showCamera.value = !showCamera.value
  if (showCamera.value) {
    await initCamera()
  } else {
    stopCamera()
  }
}

const initCamera = async () => {
  try {
    await loadFaceApiModels()
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640,
        height: 480,
        facingMode: 'user'
      } 
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (error) {
    console.error('摄像头初始化失败:', error)
    ElMessage.error('无法访问摄像头')
    showCamera.value = false
  }
}

const loadFaceApiModels = async () => {
  isLoading.value = true
  loadingProgress.value = 0
  const models = [
    { name: '人脸检测', loader: faceapi.nets.tinyFaceDetector },
    { name: '特征点检测', loader: faceapi.nets.faceLandmark68Net },
    { name: '人脸识别', loader: faceapi.nets.faceRecognitionNet },
    { name: '表情识别', loader: faceapi.nets.faceExpressionNet }
  ]
  
  try {
    // 使用本地模型路径
    const MODEL_URL = '/models'
    for (let i = 0; i < models.length; i++) {
      loadingStatus.value = `加载${models[i].name}模型...`
      await models[i].loader.loadFromUri(MODEL_URL)
      loadingProgress.value = Math.round(((i + 1) / models.length) * 100)
    }
    loadingStatus.value = '模型加载完成'
  } catch (error) {
    console.error('模型加载失败:', error)
    ElMessage.error('人脸识别模型加载失败')
    showCamera.value = false
  } finally {
    isLoading.value = false
  }
}

const stopCamera = () => {
  if (videoRef.value && videoRef.value.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
}

const startFaceDetection = async () => {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)

  const detectFace = async () => {
    if (!isDetecting.value) return
    
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()

    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    
    if (resizedDetections.length > 0) {
      const landmarks = resizedDetections[0].landmarks
      const leftEye = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      
      // 计算眼睛开合度
      const leftEyeOpenness = calculateEyeOpenness(leftEye)
      const rightEyeOpenness = calculateEyeOpenness(rightEye)
      const averageOpenness = (leftEyeOpenness + rightEyeOpenness) / 2
      
      // 检测眨眼
      if (averageOpenness < 0.2 && lastEyeState.value === 'open') {
        lastEyeState.value = 'closed'
        blinkCount.value++
        detectionStatus.value = `已检测到${blinkCount.value}次眨眼`
      } else if (averageOpenness > 0.3) {
        lastEyeState.value = 'open'
      }
      
      // 绘制检测结果
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    }
    
    if (isDetecting.value) {
      requestAnimationFrame(detectFace)
    }
  }
  
  requestAnimationFrame(detectFace)
}

const calculateEyeOpenness = (eyePoints: faceapi.Point[]) => {
  const topPoint = eyePoints[1]
  const bottomPoint = eyePoints[5]
  const distance = Math.abs(topPoint.y - bottomPoint.y)
  return distance
}

const performFaceRecognition = async () => {
  if (!videoRef.value) return null
  
  detectionStatus.value = '正在进行人脸识别...'
  const faceDescriptor = await faceService.extractFaceDescriptor(videoRef.value)
  
  if (!faceDescriptor) {
    throw new Error('未能提取到人脸特征')
  }

  const matchedFace = await faceService.findMatchingFace(faceDescriptor, loginForm.role)
  if (!matchedFace) {
    throw new Error('未找到匹配的人脸信息')
  }

  return matchedFace
}

const startLivenessDetection = async () => {
  isDetecting.value = true
  blinkCount.value = 0
  detectionStatus.value = '请眨眼以完成活体检测'
  
  try {
    await startFaceDetection()
    
    // 等待用户完成眨眼动作
    await new Promise((resolve, reject) => {
      const checkBlink = setInterval(() => {
        if (blinkCount.value >= 2) {
          clearInterval(checkBlink)
          resolve(true)
        }
      }, 1000)
      
      // 设置超时
      setTimeout(() => {
        clearInterval(checkBlink)
        reject(new Error('活体检测超时'))
      }, 10000)
    })
    
    ElMessage.success('活体检测通过')
    
    // 进行人脸识别
    const matchedFace = await performFaceRecognition()
    if (matchedFace) {
      ElMessage.success(`欢迎回来，${matchedFace.username}`)
      // TODO: 处理登录成功后的路由跳转
      await router.push('/dashboard')
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '认证失败')
  } finally {
    isDetecting.value = false
    detectionStatus.value = ''
  }
}

const registerFace = async () => {
  if (!videoRef.value) {
    ElMessage.error('请先开启摄像头')
    return
  }

  try {
    const faceDescriptor = await faceService.extractFaceDescriptor(videoRef.value)
    if (!faceDescriptor) {
      throw new Error('未能提取到人脸特征')
    }

    await faceService.saveFaceData({
      userId: `user_${Date.now()}`,
      role: loginForm.role,
      username: loginForm.username,
      descriptor: faceDescriptor,
      timestamp: Date.now()
    })

    ElMessage.success('人脸信息注册成功')
  } catch (error) {
    ElMessage.error('人脸信息注册失败')
  }
}

const showRegisterButton = computed(() => {
  return showCamera.value && !isDetecting.value && loginForm.username && loginForm.role
})

onMounted(async () => {
  if (showCamera.value) {
    await initCamera()
  }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
}

.login-card {
  width: 480px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
}

h2 {
  color: #2c3e50;
  font-size: 24px;
  margin: 0;
}

.w-full {
  width: 100%;
}

.camera-container {
  position: relative;
  width: 100%;
  height: 360px;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.face-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.camera-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.login-options {
  margin-top: 16px;
  text-align: center;
}

.detection-status {
  color: #fff;
  font-size: 16px;
  text-align: center;
  margin-bottom: 10px;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 20;
}

.loading-overlay p {
  margin-top: 16px;
  color: #409eff;
  font-size: 16px;
}
</style>