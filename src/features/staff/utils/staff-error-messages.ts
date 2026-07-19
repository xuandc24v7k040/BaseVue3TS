import axios from "axios";
import type { ErrorResponseDto } from "@/api/generated/models";

export function staffErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error))
    return "Không thể cập nhật nhân viên. Vui lòng thử lại.";
  const code = error.response?.data.code;
  if (code === "STAFF_LAST_ROLE_REQUIRED")
    return "Không thể gỡ vai trò này vì đây là vai trò nhân viên hợp lệ cuối cùng của phân công đang hoạt động. Hãy gán một vai trò khác hoặc ngừng phân công trước.";
  if (code === "USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH")
    return "Không thể kích hoạt tài khoản. Nhân viên cần có ít nhất một phân công đang hoạt động tại chi nhánh đang hoạt động và có đúng một chi nhánh chính.";
  if (error.response?.status === 403)
    return "Bạn không có quyền thực hiện thao tác này trong chi nhánh đã chọn.";
  if (error.response?.status === 404)
    return "Dữ liệu không còn tồn tại. Danh sách sẽ được tải lại.";
  if (error.response?.status === 409)
    return "Dữ liệu vừa thay đổi hoặc đang xung đột. Vui lòng tải lại và thử lại.";
  if (error.response?.status === 400)
    return error.response.data.message || "Dữ liệu gửi lên không còn hợp lệ.";
  return "Không thể cập nhật nhân viên. Vui lòng thử lại.";
}
