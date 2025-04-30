import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import TeacherDashboard from '../views/TeacherDashboard.vue'
import LiveAttendance from '../views/LiveAttendance.vue'
import AttendanceRecord from '../views/AttendanceRecord.vue'
import StudentManagement from '../views/StudentManagement.vue'
import Settings from '../views/Settings.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/dashboard',
      name: 'TeacherDashboard',
      component: TeacherDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/attendance',
      name: 'LiveAttendance',
      component: LiveAttendance,
      meta: { requiresAuth: true }
    },
    {
      path: '/records',
      name: 'AttendanceRecord',
      component: AttendanceRecord,
      meta: { requiresAuth: true }
    },
    {
      path: '/students',
      name: 'StudentManagement',
      component: StudentManagement,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: Settings,
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router