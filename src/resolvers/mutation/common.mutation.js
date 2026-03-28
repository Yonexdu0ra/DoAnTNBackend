import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import profileService from '../../services/profile.service.js'

const commonMutations = {
    updateProfile: withAuthorization('updateProfile', ROLE_ACCESS.common, async (_parent, args, context) => {
        try {
            const profile = await profileService.updateProfile(context.user.id, args.input)
            return { success: true, message: 'Cập nhật thông tin cá nhân thành công', data: profile }
        } catch (error) {
            return { success: false, message: `Cập nhật thất bại: ${error.message}`, data: null }
        }
    }),
}

export default commonMutations
