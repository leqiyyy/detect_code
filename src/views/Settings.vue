<template>
  <div class="settings-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>系统设置</span>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="settings"
            :rules="rules"
            label-width="160px"
          >
            <!-- 考勤设置 -->
            <h3 class="section-title">考勤设置</h3>
            <el-form-item label="默认考勤时间" prop="defaultAttendanceTime">
              <el-time-picker
                v-model="settings.defaultAttendanceTime"
                format="HH:mm"
                placeholder="选择时间"
              />
            </el-form-item>
            
            <el-form-item label="考勤时长(分钟)" prop="attendanceDuration">
              <el-input-number
                v-model="settings.attendanceDuration"
                :min="5"
                :max="60"
              />
            </el-form-item>

            <el-form-item label="迟到判定时间(分钟)" prop="lateThreshold">
              <el-input-number
                v-model="settings.lateThreshold"
                :min="1"
                :max="30"
              />
            </el-form-item>

            <!-- 人脸识别设置 -->
            <h3 class="section-title">人脸识别设置</h3>
            <el-form-item label="默认活体检测方案" prop="defaultDetectionMethod">
              <el-select v-model="settings.defaultDetectionMethod" class="w-full">
                <el-option
                  v-for="method in detectionMethods"
                  :key="method.value"
                  :label="method.label"
                  :value="method.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="人脸匹配阈值" prop="matchThreshold">
              <el-slider
                v-model="settings.matchThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
              />
              <div class="form-tip">
                值越大匹配要求越严格，建议设置在0.5-0.8之间
              </div>
            </el-form-item>

            <el-form-item label="最小检测置信度" prop="minDetectionConfidence">
              <el-slider
                v-model="settings.minDetectionConfidence"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
              />
            </el-form-item>

            <!-- 系统通知设置 -->
            <h3 class="section-title">系统通知设置</h3>
            <el-form-item label="启用邮件通知" prop="enableEmailNotification">
              <el-switch v-model="settings.enableEmailNotification" />
            </el-form-item>

            <el-form-item 
              label="管理员邮箱" 
              prop="adminEmail"
              v-if="settings.enableEmailNotification"
            >
              <el-input v-model="settings.adminEmail" />
            </el-form-item>

            <el-form-item label="启用异常提醒" prop="enableAbnormalAlert">
              <el-switch v-model="settings.enableAbnormalAlert" />
            </el-form-item>

            <!-- 数据管理设置 -->
            <h3 class="section-title">数据管理设置</h3>
            <el-form-item label="考勤记录保留天数" prop="recordRetentionDays">
              <el-input-number
                v-model="settings.recordRetentionDays"
                :min="30"
                :max="365"
              />
            </el-form-item>

            <el-form-item label="自动备份">
              <el-checkbox-group v-model="settings.autoBackup">
                <el-checkbox label="student">学生数据</el-checkbox>
                <el-checkbox label="attendance">考勤记录</el-checkbox>
                <el-checkbox label="face">人脸数据</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveSettings" :loading="saving">
                保存设置
              </el-button>
              <el-button @click="resetSettings">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="system-info">
          <template #header>
            <div class="card-header">
              <span>系统信息</span>
              <el-button link @click="refreshSystemInfo">
                刷新
              </el-button>
            </div>
          </template>

          <el-descriptions direction="vertical" :column="1" border>
            <el-descriptions-item label="系统版本">
              v1.0.0
            </el-descriptions-item>
            <el-descriptions-item label="人脸识别引擎">
              face-api.js
            </el-descriptions-item>
            <el-descriptions-item label="模型版本">
              tiny_face_detector_v1
            </el-descriptions-item>
            <el-descriptions-item label="数据库大小">
              {{ systemInfo.databaseSize }}
            </el-descriptions-item>
            <el-descriptions-item label="已注册人脸数">
              {{ systemInfo.registeredFaces }}
            </el-descriptions-item>
            <el-descriptions-item label="总考勤记录数">
              {{ systemInfo.totalRecords }}
            </el-descriptions-item>
            <el-descriptions-item label="上次备份时间">
              {{ formatDate(systemInfo.lastBackupTime) }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="action-buttons">
            <el-button type="warning" @click="backupData">
              立即备份
            </el-button>
            <el-button type="danger" @click="clearCache">
              清除缓存
            </el-button>
          </div>
        </el-card>

        <el-card class="tips-card">
          <template #header>
            <div class="card-header">
              <span>使用提示</span>
            </div>
          </template>
          <div class="tips-content">
            <h4>优化建议</h4>
            <ul>
              <li>建议将人脸匹配阈值设置在0.5-0.8之间</li>
              <li>考勤时长建议设置在15-30分钟之间</li>
              <li>定期备份数据可以防止意外数据丢失</li>
              <li>建议开启异常考勤提醒功能</li>
            </ul>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'

// 活体检测方案
const detectionMethods = [
  { label: '眨眼检测', value: 'blink' },
  { label: '动作检测', value: 'action' },
  { label: '深度学习', value: 'deep_learning' }
]

// 设置表单数据
const settings = reactive({
  // 考勤设置
  defaultAttendanceTime: new Date(2025, 3, 30, 8, 30),
  attendanceDuration: 30,
  lateThreshold: 5,
  
  // 人脸识别设置
  defaultDetectionMethod: 'blink',
  matchThreshold: 0.6,
  minDetectionConfidence: 0.7,
  
  // 系统通知设置
  enableEmailNotification: false,
  adminEmail: '',
  enableAbnormalAlert: true,
  
  // 数据管理设置
  recordRetentionDays: 180,
  autoBackup: ['student', 'attendance']
})

// 验证规则
const rules = {
  adminEmail: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 系统信息
const systemInfo = reactive({
  databaseSize: '1.2GB',
  registeredFaces: 120,
  totalRecords: 1580,
  lastBackupTime: new Date()
})

// 状态控制
const formRef = ref<FormInstance>()
const saving = ref(false)

// 方法
const saveSettings = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid, fields) => {
    if (valid) {
      saving.value = true
      // TODO: 实现设置保存逻辑
      setTimeout(() => {
        ElMessage.success('设置保存成功')
        saving.value = false
      }, 1000)
    }
  })
}

const resetSettings = () => {
  if (!formRef.value) return
  formRef.value.resetFields()
}

const refreshSystemInfo = () => {
  // TODO: 实现系统信息刷新逻辑
  ElMessage.success('系统信息已更新')
}

const backupData = async () => {
  try {
    // TODO: 实现数据备份逻辑
    await new Promise(resolve => setTimeout(resolve, 2000))
    systemInfo.lastBackupTime = new Date()
    ElMessage.success('数据备份成功')
  } catch (error) {
    ElMessage.error('数据备份失败')
  }
}

const clearCache = async () => {
  try {
    // TODO: 实现缓存清理逻辑
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('缓存清理成功')
  } catch (error) {
    ElMessage.error('缓存清理失败')
  }
}

const formatDate = (date: Date) => {
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.section-title {
  margin: 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
  font-weight: 500;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-info {
  margin-bottom: 20px;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.tips-card {
  margin-top: 20px;
}

.tips-content {
  color: #606266;
}

.tips-content h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.tips-content ul {
  margin: 0;
  padding-left: 20px;
}

.tips-content li {
  margin-bottom: 8px;
  font-size: 14px;
}

.w-full {
  width: 100%;
}
</style>