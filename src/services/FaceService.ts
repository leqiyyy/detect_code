import * as faceapi from 'face-api.js'

export interface FaceData {
  userId: string
  role: string
  username: string
  descriptor: Float32Array
  timestamp: number
}

class FaceService {
  private static readonly FACE_DATA_KEY = 'face_recognition_data'
  private static readonly DISTANCE_THRESHOLD = 0.5

  /**
   * 从图像中提取人脸特征描述符
   */
  async extractFaceDescriptor(
    image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<Float32Array | null> {
    try {
      const detection = await faceapi
        .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      return detection?.descriptor || null
    } catch (error) {
      console.error('提取人脸特征失败:', error)
      return null
    }
  }

  /**
   * 比较两个人脸特征描述符的相似度
   */
  compareFaceDescriptors(
    descriptor1: Float32Array,
    descriptor2: Float32Array
  ): number {
    return faceapi.euclideanDistance(descriptor1, descriptor2)
  }

  /**
   * 保存人脸数据到本地存储
   */
  async saveFaceData(data: FaceData): Promise<void> {
    try {
      const existingData = this.getAllFaceData()
      const newData = [...existingData]
      
      // 检查是否已存在该用户的人脸数据
      const existingIndex = newData.findIndex(item => item.userId === data.userId)
      if (existingIndex !== -1) {
        newData[existingIndex] = data
      } else {
        newData.push(data)
      }

      localStorage.setItem(FaceService.FACE_DATA_KEY, JSON.stringify(newData))
    } catch (error) {
      console.error('保存人脸数据失败:', error)
      throw new Error('保存人脸数据失败')
    }
  }

  /**
   * 获取所有保存的人脸数据
   */
  getAllFaceData(): FaceData[] {
    try {
      const data = localStorage.getItem(FaceService.FACE_DATA_KEY)
      if (!data) return []

      return JSON.parse(data).map((item: any) => ({
        ...item,
        descriptor: new Float32Array(Object.values(item.descriptor))
      }))
    } catch (error) {
      console.error('获取人脸数据失败:', error)
      return []
    }
  }

  /**
   * 查找匹配的人脸数据
   */
  async findMatchingFace(
    descriptor: Float32Array,
    role?: string
  ): Promise<FaceData | null> {
    const allFaceData = this.getAllFaceData()
    let bestMatch: { distance: number; data: FaceData } | null = null

    for (const faceData of allFaceData) {
      // 如果指定了角色，则只匹配相同角色的人脸
      if (role && faceData.role !== role) continue

      const distance = this.compareFaceDescriptors(descriptor, faceData.descriptor)
      
      if (distance < FaceService.DISTANCE_THRESHOLD) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { distance, data: faceData }
        }
      }
    }

    return bestMatch?.data || null
  }
}

export const faceService = new FaceService()