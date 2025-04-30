<template>
  <div class="dashboard-container">
    <el-container>
      <el-aside width="240px">
        <div class="sidebar">
          <div class="sidebar-header">
            <img src="../assets/vue.svg" alt="Logo" class="logo">
            <h3>考勤管理系统</h3>
          </div>
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            @select="handleMenuSelect"
          >
            <el-menu-item index="overview">
              <el-icon><DataLine /></el-icon>
              <span>数据概览</span>
            </el-menu-item>
            <el-menu-item index="attendance">
              <el-icon><Calendar /></el-icon>
              <span>考勤管理</span>
            </el-menu-item>
            <el-menu-item index="classes">
              <el-icon><List /></el-icon>
              <span>班级管理</span>
            </el-menu-item>
            <el-menu-item index="settings">
              <el-icon><Setting /></el-icon>
              <span>系统设置</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-aside>
      
      <el-container>
        <el-header>
          <div class="header-content">
            <div class="breadcrumb">
              <el-breadcrumb>
                <el-breadcrumb-item>首页</el-breadcrumb-item>
                <el-breadcrumb-item>{{ currentPage }}</el-breadcrumb-item>
              </el-breadcrumb>
            </div>
            <div class="header-right">
              <el-dropdown>
                <span class="user-profile">
                  <el-avatar :size="32" icon="UserFilled" />
                  <span class="username">{{ teacherName }}</span>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>
        
        <el-main>
          <!-- 数据概览部分 -->
          <div v-if="activeMenu === 'overview'" class="overview-section">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-card class="statistics-card">
                  <template #header>
                    <div class="card-header">
                      <span>今日出勤率</span>
                    </div>
                  </template>
                  <div class="statistics-value">
                    <el-progress
                      type="dashboard"
                      :percentage="attendanceRate"
                      :color="getProgressColor"
                    />
                    <div class="statistics-label">{{ attendanceRate }}%</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card class="statistics-card">
                  <template #header>
                    <div class="card-header">
                      <span>总学生人数</span>
                    </div>
                  </template>
                  <div class="statistics-value">
                    <h2>{{ totalStudents }}</h2>
                    <small>名学生</small>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card class="statistics-card">
                  <template #header>
                    <div class="card-header">
                      <span>异常考勤</span>
                    </div>
                  </template>
                  <div class="statistics-value warning">
                    <h2>{{ abnormalRecords }}</h2>
                    <small>条记录</small>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-card class="chart-card">
              <template #header>
                <div class="card-header">
                  <span>近期考勤趋势</span>
                  <el-radio-group v-model="chartTimeRange" size="small">
                    <el-radio-button label="week">本周</el-radio-button>
                    <el-radio-button label="month">本月</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div class="chart-container">
                <canvas ref="attendanceChart"></canvas>
              </div>
            </el-card>
          </div>

          <!-- 考勤管理部分 -->
          <div v-if="activeMenu === 'attendance'" class="attendance-section">
            <div class="section-header">
              <el-button type="primary" @click="startAttendance">
                开始考勤
              </el-button>
              <div class="detection-method">
                <span>活体检测方案：</span>
                <el-select v-model="currentDetectionMethod" size="default">
                  <el-option 
                    v-for="method in detectionMethods"
                    :key="method.value"
                    :label="method.label"
                    :value="method.value"
                  />
                </el-select>
              </div>
            </div>

            <el-table :data="attendanceRecords" style="width: 100%; margin-top: 20px;">
              <el-table-column prop="date" label="日期" width="180" />
              <el-table-column prop="className" label="班级" width="120" />
              <el-table-column prop="present" label="出勤人数" width="120" />
              <el-table-column prop="absent" label="缺勤人数" width="120" />
              <el-table-column prop="status" label="状态">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button link type="primary" @click="viewDetails(scope.row)">
                    查看详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 班级管理部分 -->
          <div v-if="activeMenu === 'classes'" class="classes-section">
            <el-button type="primary" @click="addClass">
              添加班级
            </el-button>
            
            <el-table :data="classes" style="width: 100%; margin-top: 20px;">
              <el-table-column prop="name" label="班级名称" />
              <el-table-column prop="studentCount" label="学生人数" width="120" />
              <el-table-column prop="teacher" label="班主任" width="120" />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button link type="primary" @click="editClass(scope.row)">
                    编辑
                  </el-button>
                  <el-button link type="danger" @click="deleteClass(scope.row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 系统设置部分 -->
          <div v-if="activeMenu === 'settings'" class="settings-section">
            <el-form :model="settings" label-width="120px">
              <el-form-item label="默认活体检测">
                <el-select v-model="settings.defaultDetection">
                  <el-option 
                    v-for="method in detectionMethods"
                    :key="method.value"
                    :label="method.label"
                    :value="method.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="考勤时间设置">
                <el-time-picker
                  v-model="settings.attendanceTime"
                  format="HH:mm"
                  placeholder="选择时间"
                />
              </el-form-item>
              <el-form-item label="人脸匹配阈值">
                <el-slider
                  v-model="settings.matchThreshold"
                  :min="0"
                  :max="1"
                  :step="0.1"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveSettings">
                  保存设置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Calendar, DataLine, List, Setting } from '@element-plus/icons-vue'
import Chart from 'chart.js/auto'

// 路由
const router = useRouter()

// 基础数据
const teacherName = ref('张老师')
const activeMenu = ref('overview')
const currentPage = computed(() => {
  const menuMap = {
    overview: '数据概览',
    attendance: '考勤管理',
    classes: '班级管理',
    settings: '系统设置'
  }
  return menuMap[activeMenu.value] || '数据概览'
})

// 统计数据
const attendanceRate = ref(95)
const totalStudents = ref(120)
const abnormalRecords = ref(3)
const chartTimeRange = ref('week')

// 活体检测方案
const detectionMethods = [
  { label: '眨眼检测', value: 'blink' },
  { label: '动作检测', value: 'action' },
  { label: '深度学习', value: 'deep_learning' }
]
const currentDetectionMethod = ref('blink')

// 考勤记录
const attendanceRecords = ref([
  {
    date: '2025-04-30',
    className: '计科2101',
    present: 58,
    absent: 2,
    status: '已完成'
  },
  // ... 更多记录
])

// 班级列表
const classes = ref([
  {
    name: '计科2101',
    studentCount: 60,
    teacher: '张老师'
  },
  // ... 更多班级
])

// 系统设置
const settings = reactive({
  defaultDetection: 'blink',
  attendanceTime: new Date(2025, 3, 30, 8, 30),
  matchThreshold: 0.6
})

// 方法
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
}

const handleLogout = () => {
  router.push('/login')
}

const getProgressColor = (percentage: number) => {
  if (percentage < 80) return '#f56c6c'
  if (percentage < 90) return '#e6a23c'
  return '#67c23a'
}

const getStatusType = (status: string) => {
  const statusMap = {
    '已完成': 'success',
    '进行中': 'warning',
    '未开始': 'info'
  }
  return statusMap[status] || 'info'
}

const startAttendance = () => {
  router.push('/attendance')
}

const viewDetails = (row: any) => {
  // TODO: 查看考勤详情
  console.log('查看详情:', row)
}

const addClass = () => {
  // TODO: 添加班级
  console.log('添加班级')
}

const editClass = (row: any) => {
  // TODO: 编辑班级
  console.log('编辑班级:', row)
}

const deleteClass = (row: any) => {
  // TODO: 删除班级
  console.log('删除班级:', row)
}

const saveSettings = () => {
  ElMessage.success('设置保存成功')
}

// 图表初始化
onMounted(() => {
  const ctx = document.getElementById('attendanceChart') as HTMLCanvasElement
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['周一', '周二', '周三', '周四', '周五'],
        datasets: [{
          label: '出勤率',
          data: [95, 93, 96, 94, 95],
          borderColor: '#409eff',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    })
  }
})
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
}

.sidebar-header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #e6e6e6;
}

.logo {
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
}

.sidebar-menu {
  border-right: none;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}

.header-content {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-profile {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 8px;
  font-size: 14px;
}

.el-main {
  padding: 20px;
}

.statistics-card {
  height: 180px;
}

.statistics-value {
  text-align: center;
  padding: 20px 0;
}

.statistics-value h2 {
  font-size: 36px;
  margin: 0;
  color: #303133;
}

.statistics-value small {
  color: #909399;
}

.statistics-value.warning h2 {
  color: #e6a23c;
}

.chart-card {
  margin-top: 20px;
}

.chart-container {
  height: 300px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detection-method {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-section {
  max-width: 600px;
  margin: 0 auto;
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}
</style>