<template>
  <div class="attendance-container">
    <el-container>
      <el-aside width="320px">
        <div class="attendance-sidebar">
          <div class="class-info">
            <h3>{{ currentClass.name }}</h3>
            <p>应到人数：{{ currentClass.totalStudents }}人</p>
            <p>已到人数：{{ attendedStudents.length }}人</p>
            <p>未到人数：{{ currentClass.totalStudents - attendedStudents.length }}人</p>
          </div>

          <div class="detection-settings">
            <h4>活体检测设置</h4>
            <el-form :model="settings" label-position="top">
              <el-form-item label="检测方案">
                <el-select v-model="settings.detectionMethod" class="w-full">
                  <el-option
                    v-for="method in detectionMethods"
                    :key="method.value"
                    :label="method.label"
                    :value="method.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="匹配阈值">
                <el-slider
                  v-model="settings.matchThreshold"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  show-input
                />
              </el-form-item>
            </el-form>
          </div>

          <div class="attendance-list">
            <h4>考勤记录</h4>
            <el-scrollbar height="400px">
              <ul class="record-list">
                <li v-for="record in attendanceRecords" :key="record.timestamp" :class="record.status">
                  <div class="record-avatar">
                    <el-avatar :size="32" :src="record.avatar" />
                  </div>
                  <div class="record-info">
                    <span class="record-name">{{ record.name }}</span>
                    <span class="record-time">{{ formatTime(record.timestamp) }}</span>
                  </div>
                  <el-tag :type="getStatusType(record.status)" size="small">
                    {{ record.status }}
                  </el-tag>
                </li>
              </ul>
            </el-scrollbar>
          </div>

          <div class="action-buttons">
            <el-button type="primary" @click="finishAttendance" :disabled="!isAttendanceStarted">
              结束考勤
            </el-button>
            <el-button @click="returnToDashboard">
              返回面板
            </el-button>
          </div>
        </div>
      </el-aside>

      <el-main>
        <div class="camera-section">
          <div class="camera-container">
            <video ref="videoRef" class="camera-preview" autoplay muted></video>
            <canvas ref="canvasRef" class="detection-canvas"></canvas>
            
            <div v-if="isLoading" class="loading-overlay">
              <el-progress type="circle" :percentage="loadingProgress" />
              <p>{{ loadingStatus }}</p>
            </div>

            <div class="detection-status" v-if="!isLoading">
              <el-alert
                v-if="detectionMessage"
                :type="detectionStatus"
                :title="detectionMessage"
                :closable="false"
                show-icon
              />
            </div>

            <div class="camera-controls" v-if="!isLoading">
              <el-button-group>
                <el-button 
                  type="primary" 
                  :icon="VideoCamera"
                  @click="toggleAttendance"
                  :loading="isProcessing"
                >
                  {{ isAttendanceStarted ? '暂停考勤' : '开始考勤' }}
                </el-button>
                <el-button 
                  type="warning" 
                  :icon="RefreshRight"
                  @click="resetDetection"
                  :disabled="!isAttendanceStarted"
                >
                  重置检测
                </el-button>
              </el-button-group>
            </div>
          </div>

          <div class="detection-info">
            <el-descriptions 
              title="实时检测信息" 
              :column="3" 
              border
            >
              <el-descriptions-item label="检测状态">
                <el-tag :type="isProcessing ? 'warning' : 'success'">
                  {{ isProcessing ? '检测中' : '就绪' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="当前检测方案">
                {{ getCurrentMethodLabel }}
              </el-descriptions-item>
              <el-descriptions-item label="匹配阈值">
                {{ settings.matchThreshold }}
              </el-descriptions-item>
              <el-descriptions-item label="已识别人数">
                {{ attendedStudents.length }}
              </el-descriptions-item>
              <el-descriptions-item label="剩余人数">
                {{ currentClass.totalStudents - attendedStudents.length }}
              </el-descriptions-item>
              <el-descriptions-item label="考勤进度">
                {{ Math.round((attendedStudents.length / currentClass.totalStudents) * 100) }}%
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { VideoCamera, RefreshRight } from '@element-plus/icons-vue'
import * as faceapi from 'face-api.js'
import { faceService } from '../services/FaceService'

const router = useRouter()

// 基础数据
const currentClass = reactive({
  name: '计科2101',
  totalStudents: 60,
  teacher: '张老师'
})

// 考勤设置
const detectionMethods = [
  { label: '眨眼检测', value: 'blink' },
  { label: '动作检测', value: 'action' },
  { label: '深度学习', value: 'deep_learning' }
]

const settings = reactive({
  detectionMethod: 'blink',
  matchThreshold: 0.6
})

// 状态控制
const isLoading = ref(true)
const loadingProgress = ref(0)
const loadingStatus = ref('')
const isAttendanceStarted = ref(false)
const isProcessing = ref(false)
const detectionStatus = ref('info')
const detectionMessage = ref('')

// DOM引用
const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()

// 考勤数据
const attendedStudents = ref<any[]>([])
const attendanceRecords = ref<any[]>([])

// 计算属性
const getCurrentMethodLabel = computed(() => {
  const method = detectionMethods.find(m => m.value === settings.detectionMethod)
  return method ? method.label : '未知'
})

// 方法
const initCamera = async () => {
  try {
    await loadFaceModels()
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
    returnToDashboard()
  }
}

const loadFaceModels = async () => {
  try {
    isLoading.value = true
    loadingProgress.value = 0
    const models = [
      { name: '人脸检测', loader: faceapi.nets.tinyFaceDetector },
      { name: '特征点检测', loader: faceapi.nets.faceLandmark68Net },
      { name: '人脸识别', loader: faceapi.nets.faceRecognitionNet },
      { name: '表情识别', loader: faceapi.nets.faceExpressionNet }
    ]

    const MODEL_URL = '/models'
    for (let i = 0; i < models.length; i++) {
      loadingStatus.value = `加载${models[i].name}模型...`
      await models[i].loader.loadFromUri(MODEL_URL)
      loadingProgress.value = Math.round(((i + 1) / models.length) * 100)
    }
    
    loadingStatus.value = '模型加载完成'
    isLoading.value = false
  } catch (error) {
    console.error('模型加载失败:', error)
    ElMessage.error('人脸识别模型加载失败')
    returnToDashboard()
  }
}

const startDetection = async () => {
  if (!videoRef.value || !canvasRef.value || !isAttendanceStarted.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)

  const detectFace = async () => {
    if (!isAttendanceStarted.value) return

    try {
      isProcessing.value = true
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()

      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      
      if (resizedDetections.length > 0) {
        // 绘制检测框和特征点
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)

        // 进行人脸匹配
        for (const detection of resizedDetections) {
          const descriptor = detection.descriptor
          const matchedFace = await faceService.findMatchingFace(descriptor)
          
          if (matchedFace && !attendedStudents.value.find(s => s.userId === matchedFace.userId)) {
            // 添加考勤记录
            attendedStudents.value.push(matchedFace)
            attendanceRecords.value.unshift({
              userId: matchedFace.userId,
              name: matchedFace.username,
              timestamp: Date.now(),
              status: '已到',
              avatar: '' // TODO: 添加头像
            })

            ElMessage.success(`识别到学生: ${matchedFace.username}`)
          }
        }
      }

      if (isAttendanceStarted.value) {
        requestAnimationFrame(detectFace)
      }
    } catch (error) {
      console.error('人脸检测错误:', error)
      detectionMessage.value = '人脸检测出错，请重试'
      detectionStatus.value = 'error'
    } finally {
      isProcessing.value = false
    }
  }

  requestAnimationFrame(detectFace)
}

const toggleAttendance = () => {
  isAttendanceStarted.value = !isAttendanceStarted.value
  if (isAttendanceStarted.value) {
    detectionMessage.value = '考勤进行中...'
    detectionStatus.value = 'success'
    startDetection()
  } else {
    detectionMessage.value = '考勤已暂停'
    detectionStatus.value = 'warning'
  }
}

const resetDetection = () => {
  attendedStudents.value = []
  attendanceRecords.value = []
  detectionMessage.value = '检测已重置'
  detectionStatus.value = 'info'
}

const finishAttendance = () => {
  // TODO: 保存考勤记录
  ElMessage.success('考勤记录已保存')
  returnToDashboard()
}

const returnToDashboard = () => {
  router.push('/dashboard')
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    '已到': 'success',
    '迟到': 'warning',
    '异常': 'danger'
  }
  return statusMap[status] || 'info'
}

// 生命周期钩子
onMounted(async () => {
  await initCamera()
})

onUnmounted(() => {
  isAttendanceStarted.value = false
  if (videoRef.value && videoRef.value.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
  }
})
</script>

<style scoped>
.attendance-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.attendance-sidebar {
  height: 100%;
  padding: 20px;
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-info {
  padding: 15px;
  background-color: #f2f6fc;
  border-radius: 4px;
}

.class-info h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.class-info p {
  margin: 5px 0;
  color: #606266;
}

.detection-settings {
  padding: 15px;
  background-color: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
}

.detection-settings h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.camera-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.camera-container {
  position: relative;
  width: 100%;
  height: 480px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
}

.detection-status {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 80%;
}

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.attendance-list {
  flex: 1;
  overflow: hidden;
}

.attendance-list h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.record-list li {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  gap: 10px;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-name {
  font-weight: 500;
  color: #303133;
}

.record-time {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.w-full {
  width: 100%;
}

.detection-info {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}
</style>