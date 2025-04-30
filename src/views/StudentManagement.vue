<template>
  <div class="student-container">
    <el-card class="filter-card">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="班级">
            <el-select v-model="filterForm.class" placeholder="选择班级">
              <el-option
                v-for="item in classList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="学号/姓名">
            <el-input 
              v-model="filterForm.keyword" 
              placeholder="请输入学号或姓名"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="operation-bar">
        <el-button type="primary" @click="handleAdd">
          添加学生
        </el-button>
        <el-button type="success" @click="batchImport">
          批量导入
        </el-button>
      </div>
    </el-card>

    <!-- 学生列表 -->
    <el-card class="list-card">
      <el-table :data="studentList" style="width: 100%">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="studentId" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="className" label="班级" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            {{ scope.row.gender === 'male' ? '男' : '女' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column prop="hasFaceData" label="人脸信息" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.hasFaceData ? 'success' : 'warning'">
              {{ scope.row.hasFaceData ? '已采集' : '未采集' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="scope">
            <el-button 
              link 
              type="primary" 
              @click="collectFace(scope.row)"
              :disabled="isCollecting"
            >
              {{ scope.row.hasFaceData ? '重新采集' : '采集人脸' }}
            </el-button>
            <el-button link type="primary" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 学生信息编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加学生' : '编辑学生'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="studentForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="学号" prop="studentId">
          <el-input 
            v-model="studentForm.studentId"
            :disabled="dialogType === 'edit'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="studentForm.name" />
        </el-form-item>
        <el-form-item label="班级" prop="className">
          <el-select v-model="studentForm.className" class="w-full">
            <el-option
              v-for="item in classList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="studentForm.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="studentForm.phone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 人脸采集对话框 -->
    <el-dialog
      v-model="faceDialogVisible"
      title="人脸信息采集"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="face-collection">
        <div class="camera-container">
          <video 
            ref="videoRef"
            class="camera-preview"
            autoplay 
            muted
          ></video>
          <canvas 
            ref="canvasRef"
            class="face-canvas"
          ></canvas>

          <div class="camera-overlay" v-if="!isCollecting">
            <el-button 
              type="primary"
              size="large"
              @click="startCollection"
            >
              开始采集
            </el-button>
          </div>

          <div class="collection-status" v-else>
            <el-progress
              type="circle"
              :percentage="collectionProgress"
              :status="collectionProgress >= 100 ? 'success' : 'warning'"
            />
            <p class="status-text">{{ collectionStatus }}</p>
          </div>
        </div>

        <div class="collection-guide">
          <h4>采集指南</h4>
          <ol>
            <li>请确保面部在摄像头范围内且光线充足</li>
            <li>请按照提示完成不同角度的人脸采集</li>
            <li>采集过程中请保持自然表情</li>
            <li>采集完成后系统将自动进行人脸特征提取</li>
          </ol>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelCollection" :disabled="isCollecting">
            取消
          </el-button>
          <el-button 
            type="primary" 
            @click="completeCollection"
            :disabled="!isCollectionComplete"
          >
            完成
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入学生"
      width="500px"
    >
      <div class="import-dialog">
        <el-upload
          class="upload-demo"
          drag
          action="/api/students/import"
          :auto-upload="false"
          :on-change="handleFileChange"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              请上传 xlsx 格式的文件，
              <el-link type="primary" @click="downloadTemplate">
                下载模板
              </el-link>
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitImport" :loading="importing">
            开始导入
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import * as faceapi from 'face-api.js'
import { faceService } from '../services/FaceService'

// 基础数据
const classList = [
  { label: '计科2101', value: 'cs2101' },
  { label: '计科2102', value: 'cs2102' }
]

// 筛选表单
const filterForm = reactive({
  class: '',
  keyword: ''
})

// 分页控制
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 学生列表数据
const studentList = ref([
  {
    studentId: '2021001',
    name: '张三',
    className: 'cs2101',
    gender: 'male',
    phone: '13800138000',
    hasFaceData: true
  }
  // ... 更多数据
])

// 表单数据和验证规则
const formRef = ref<FormInstance>()
const studentForm = reactive({
  studentId: '',
  name: '',
  className: '',
  gender: 'male',
  phone: ''
})

const rules = {
  studentId: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { pattern: /^\d{7}$/, message: '学号必须为7位数字', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在2-10个字符', trigger: 'blur' }
  ],
  className: [
    { required: true, message: '请选择班级', trigger: 'change' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 对话框控制
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const faceDialogVisible = ref(false)
const importDialogVisible = ref(false)
const importing = ref(false)

// 人脸采集相关
const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const isCollecting = ref(false)
const collectionProgress = ref(0)
const collectionStatus = ref('')
const isCollectionComplete = ref(false)
const currentStudent = ref<any>(null)

// 方法
const handleSearch = () => {
  // TODO: 实现搜索逻辑
  console.log('搜索条件:', filterForm)
}

const resetFilter = () => {
  filterForm.class = ''
  filterForm.keyword = ''
}

const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(studentForm, {
    studentId: '',
    name: '',
    className: '',
    gender: 'male',
    phone: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogType.value = 'edit'
  Object.assign(studentForm, row)
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该学生信息吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    // TODO: 实现删除逻辑
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid, fields) => {
    if (valid) {
      // TODO: 实现表单提交逻辑
      ElMessage.success(
        dialogType.value === 'add' ? '添加成功' : '修改成功'
      )
      dialogVisible.value = false
    }
  })
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  // TODO: 重新加载数据
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  // TODO: 重新加载数据
}

// 人脸采集相关方法
const collectFace = (student: any) => {
  currentStudent.value = student
  faceDialogVisible.value = true
  initCamera()
}

const initCamera = async () => {
  try {
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
    faceDialogVisible.value = false
  }
}

const startCollection = async () => {
  if (!videoRef.value || !canvasRef.value) return

  isCollecting.value = true
  collectionProgress.value = 0
  collectionStatus.value = '请保持面部在摄像头范围内...'

  // 开始采集不同角度的人脸
  const angles = [
    { name: '正面', progress: 30 },
    { name: '左侧', progress: 60 },
    { name: '右侧', progress: 90 }
  ]

  for (const angle of angles) {
    collectionStatus.value = `请将头部缓慢转向${angle.name}...`
    await new Promise(resolve => setTimeout(resolve, 3000))
    collectionProgress.value = angle.progress
  }

  collectionStatus.value = '采集完成，正在处理...'
  collectionProgress.value = 100
  isCollectionComplete.value = true
}

const cancelCollection = () => {
  if (isCollecting.value) {
    ElMessageBox.confirm(
      '确定要取消人脸采集吗？当前采集的数据将丢失。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      stopCamera()
      faceDialogVisible.value = false
    })
  } else {
    stopCamera()
    faceDialogVisible.value = false
  }
}

const completeCollection = async () => {
  if (!videoRef.value || !currentStudent.value) return

  try {
    const descriptor = await faceService.extractFaceDescriptor(videoRef.value)
    if (!descriptor) {
      throw new Error('未能提取到人脸特征')
    }

    await faceService.saveFaceData({
      userId: currentStudent.value.studentId,
      role: 'student',
      username: currentStudent.value.name,
      descriptor,
      timestamp: Date.now()
    })

    ElMessage.success('人脸信息采集成功')
    currentStudent.value.hasFaceData = true
    stopCamera()
    faceDialogVisible.value = false
  } catch (error) {
    ElMessage.error('人脸信息采集失败')
  }
}

const stopCamera = () => {
  if (videoRef.value && videoRef.value.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
  isCollecting.value = false
  isCollectionComplete.value = false
  collectionProgress.value = 0
  collectionStatus.value = ''
}

// 批量导入相关方法
const handleFileChange = (file: any) => {
  // TODO: 处理文件变更
  console.log('选择的文件:', file)
}

const submitImport = async () => {
  importing.value = true
  try {
    // TODO: 实现文件上传和导入逻辑
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('导入成功')
    importDialogVisible.value = false
  } catch (error) {
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

const downloadTemplate = () => {
  // TODO: 实现模板下载逻辑
  console.log('下载模板')
}

// 生命周期钩子
onMounted(() => {
  // 初始化加载数据
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.student-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.filter-card {
  margin-bottom: 20px;
}

.operation-bar {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.list-card {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.face-collection {
  display: flex;
  gap: 20px;
}

.camera-container {
  position: relative;
  width: 640px;
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

.face-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.camera-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.collection-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.status-text {
  margin-top: 16px;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.collection-guide {
  flex: 1;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.collection-guide h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.collection-guide ol {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.collection-guide li {
  margin-bottom: 12px;
}

.w-full {
  width: 100%;
}

.import-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>