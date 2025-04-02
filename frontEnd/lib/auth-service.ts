export const authService = {
  login: async (email: string, password: string) => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful login
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Return a fake token
      return { token: "fake-jwt-token", user: { name: "John Doe", email } }
    } catch (error) {
      throw new Error("Login failed")
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful registration
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Return a fake token
      return { token: "fake-jwt-token", user: { name, email } }
    } catch (error) {
      throw new Error("Registration failed")
    }
  },

  logout: async () => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful logout
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Clear token from localStorage
      localStorage.removeItem("token")

      return true
    } catch (error) {
      throw new Error("Logout failed")
    }
  },

  getProfile: async () => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just return fake user data
      await new Promise((resolve) => setTimeout(resolve, 500))

      return {
        id: "user1",
        name: "John",
        lastName1: "Doe",
        lastName2: "",
        nickname: "johndoe",
        email: "john.doe@example.com",
        avatar: "/placeholder-user.jpg",
      }
    } catch (error) {
      throw new Error("Failed to get profile")
    }
  },

  updateProfile: async (profileData: any) => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful update
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return { ...profileData, updated: true }
    } catch (error) {
      throw new Error("Failed to update profile")
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful password change
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return { success: true }
    } catch (error) {
      throw new Error("Failed to change password")
    }
  },

  deleteAccount: async () => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful account deletion
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Clear token from localStorage
      localStorage.removeItem("token")

      return { success: true }
    } catch (error) {
      throw new Error("Failed to delete account")
    }
  },
}

