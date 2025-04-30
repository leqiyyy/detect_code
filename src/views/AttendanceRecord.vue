<template>
  <div class="record-container">
    <el-card class="search-card">
      <div class="search-form">
        <el-form :model="searchForm" :inline="true">
          <el-form-item label="班级">
            <el-select v-model="searchForm.class" placeholder="选择班级">
              <el-option
                v-for="item in classList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="日期范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :shortcuts="dateShortcuts"
            />
          </el-form-item>

          <el-form-item label="考勤状态">
            <el-select v-model="searchForm.status" placeholder="选择状态">
              <el-option label="全部" value="" />
              <el-option label="正常" value="normal" />
              <el-option label="迟到" value="late" />
              <el-option label="缺勤" value="absent" />
              <el-option label="异常" value="abnormal" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="operation-bar">
        <div class="left">
          <el-button type="success" @click="exportToExcel">
            导出Excel
          </el-button>
        </div>
        <div class="right">
          <el-radio-group v-model="viewType" size="small">
            <el-radio-button label="table">表格视图</el-radio-button>
            <el-radio-button label="calendar">日历视图</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </el-card>

    <!-- 表格视图 -->
    <div v-if="viewType === 'table'" class="table-view">
      <el-card>
        <el-table
          :data="recordData"
          style="width: 100%"
          :default-sort="{ prop: 'date', order: 'descending' }"
        >
          <el-table-column prop="date" label="日期" sortable width="180">
            <template #default="scope">
              {{ formatDate(scope.row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="className" label="班级" width="120" />
          <el-table-column prop="studentId" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="120" />
          <el-table-column prop="checkInTime" label="签到时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.checkInTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="detectionMethod" label="检测方式" width="120" />
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="scope">
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
            :total="totalRecords"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 日历视图 -->
    <div v-else class="calendar-view">
      <el-card>
        <el-calendar v-model="currentDate">
          <template #dateCell="{ data }">
            <div class="calendar-cell">
              <p :class="data.isSelected ? 'is-selected' : ''">
                {{ data.day.split('-').slice(2).join('') }}
              </p>
              <div class="calendar-info" v-if="getDateInfo(data)">
                <el-tooltip
                  :content="getDateTooltip(data)"
                  placement="top"
                  effect="light"
                >
                  <div class="attendance-stats">
                    <span class="stat normal">{{ getDateStats(data).normal }}</span>
                    <span class="stat late">{{ getDateStats(data).late }}</span>
                    <span class="stat absent">{{ getDateStats(data).absent }}</span>
                  </div>
                </el-tooltip>
              </div>
            </div>
          </template>
        </el-calendar>
      </el-card>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'edit' ? '编辑考勤记录' : '删除考勤记录'"
      width="500px"
    >
      <el-form
        v-if="dialogType === 'edit'"
        :model="editForm"
        label-width="100px"
      >
        <el-form-item label="考勤状态">
          <el-select v-model="editForm.status" class="w-full">
            <el-option label="正常" value="normal" />
            <el-option label="迟到" value="late" />
            <el-option label="缺勤" value="absent" />
            <el-option label="异常" value="abnormal" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <div v-else class="delete-confirm">
        <p>确定要删除该考勤记录吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmDialog"
            :loading="dialogSubmitting"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { DateCell } from 'element-plus'

// 基础数据
const classList = [
  { label: '计科2101', value: 'cs2101' },
  { label: '计科2102', value: 'cs2102' }
]

const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  }
]

// 搜索表单
const searchForm = reactive({
  class: '',
  dateRange: [],
  status: ''
})

// 视图控制
const viewType = ref('table')
const currentDate = ref(new Date())
const currentPage = ref(1)
const pageSize = ref(20)
const totalRecords = ref(100)

// 表格数据
const recordData = ref([
  {
    date: '2025-04-30',
    className: '计科2101',
    studentId: '2021001',
    studentName: '张三',
    checkInTime: '2025-04-30 08:30:00',
    status: 'normal',
    detectionMethod: '眨眼检测'
  }
  // ... 更多数据
])

// 对话框控制
const dialogVisible = ref(false)
const dialogType = ref<'edit' | 'delete'>('edit')
const dialogSubmitting = ref(false)
const editForm = reactive({
  status: '',
  remark: ''
})

// 方法
const handleSearch = () => {
  // TODO: 实现搜索逻辑
  console.log('搜索条件:', searchForm)
}

const resetSearch = () => {
  searchForm.class = ''
  searchForm.dateRange = []
  searchForm.status = ''
}

const exportToExcel = () => {
  // TODO: 实现导出Excel功能
  ElMessage.success('导出成功')
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  // TODO: 重新加载数据
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  // TODO: 重新加载数据
}

const handleEdit = (row: any) => {
  dialogType.value = 'edit'
  editForm.status = row.status
  editForm.remark = row.remark || ''
  dialogVisible.value = true
}

const handleDelete = (row: any) => {
  dialogType.value = 'delete'
  dialogVisible.value = true
}

const confirmDialog = async () => {
  dialogSubmitting.value = true
  try {
    if (dialogType.value === 'edit') {
      // TODO: 实现编辑保存逻辑
      ElMessage.success('修改成功')
    } else {
      // TODO: 实现删除逻辑
      ElMessage.success('删除成功')
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    dialogSubmitting.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    normal: 'success',
    late: 'warning',
    absent: 'danger',
    abnormal: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    normal: '正常',
    late: '迟到',
    absent: '缺勤',
    abnormal: '异常'
  }
  return labelMap[status] || status
}

const getDateInfo = (data: DateCell) => {
  // TODO: 获取日期的考勤信息
  return true
}

const getDateStats = (data: DateCell) => {
  // TODO: 获取日期的考勤统计
  return {
    normal: 55,
    late: 3,
    absent: 2
  }
}

const getDateTooltip = (data: DateCell) => {
  const stats = getDateStats(data)
  return `正常: ${stats.normal}人\n迟到: ${stats.late}人\n缺勤: ${stats.absent}人`
}
</script>

<style scoped>
.record-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 20px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.table-view, .calendar-view {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.calendar-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px;
}

.calendar-info {
  font-size: 12px;
  color: #606266;
}

.attendance-stats {
  display: flex;
  gap: 4px;
}

.stat {
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.stat.normal {
  background-color: #f0f9eb;
  color: #67c23a;
}

.stat.late {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.stat.absent {
  background-color: #fef0f0;
  color: #f56c6c;
}

.w-full {
  width: 100%;
}

.delete-confirm {
  text-align: center;
  color: #606266;
}

.is-selected {
  color: #409eff;
  font-weight: bold;
}
</style>