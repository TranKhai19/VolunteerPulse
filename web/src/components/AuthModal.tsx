"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck, UserCheck, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { AuthRole, UserProfile } from "@/types/volunteer-pulse";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  currentProfile: UserProfile | null;
  accessToken: string | null;
}

const ROLE_LABELS: Record<AuthRole, string> = {
  pending: "Chờ duyệt",
  volunteer: "Tình nguyện viên",
  dtu_unit: "Đơn vị ĐH Duy Tân",
  commune_youth: "Đoàn Xã / Phường",
  coordinator: "BCH Điều phối",
  admin: "Admin Đoàn trường",
};

export default function AuthModal({
  open,
  onClose,
  onAuthSuccess,
  currentProfile,
  accessToken,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "admin">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  if (!open) return null;

  const isAdmin =
    currentProfile?.approved &&
    (currentProfile.role === "admin" || currentProfile.role === "coordinator");

  async function loadUsers() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách tài khoản.");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL / ANON_KEY.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuthSuccess();
        onClose();
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (err) throw err;
        setMessage(
          "Đăng ký thành công! Tài khoản đang ở trạng thái Chờ duyệt. Vui lòng liên hệ Admin Đoàn trường để cấp vai trò thao tác."
        );
        onAuthSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(u: UserProfile, nextRole: AuthRole, nextApproved: boolean) {
    if (!accessToken) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: u.id,
          role: nextRole,
          approved: nextApproved,
          orgName: u.orgName,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Cập nhật thất bại");
      }
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? { ...item, role: nextRole, approved: nextApproved } : item
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi cập nhật tài khoản.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#102824]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#DCE2DC] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EAEEEA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#145DA0]" />
            <h2 className="font-display font-bold text-lg text-[#102824]">
              {mode === "admin"
                ? "Quản trị tài khoản & Phân quyền"
                : mode === "signup"
                  ? "Đăng ký tài khoản vận hành"
                  : "Đăng nhập hệ thống"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F2F5F2] text-[#4A5D58] cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2 border-b border-[#EAEEEA] pb-3">
          {!currentProfile ? (
            <>
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  mode === "signin"
                    ? "bg-[#102824] text-white"
                    : "bg-[#F3F6F4] text-[#4A5D58]"
                }`}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  mode === "signup"
                    ? "bg-[#102824] text-white"
                    : "bg-[#F3F6F4] text-[#4A5D58]"
                }`}
              >
                Đăng ký mới
              </button>
            </>
          ) : (
            isAdmin && (
              <button
                onClick={() => {
                  setMode("admin");
                  void loadUsers();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#145DA0] text-white cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Tải danh sách duyệt tài khoản
              </button>
            )
          )}
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-[#FDF1EC] border border-[#E7B5A3] text-xs text-[#B33D18]">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-[#ECF7F2] border border-[#B7E1D2] text-xs text-[#157A5B]">
              {message}
            </div>
          )}

          {mode === "admin" && isAdmin ? (
            <div className="space-y-3">
              {users.length === 0 ? (
                <p className="text-xs text-[#5A6E68]">
                  {loading ? "Đang tải..." : "Bấm nút ở trên để tải danh sách tài khoản."}
                </p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl border border-[#DCE2DC] flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#102824] truncate">
                        {u.fullName || u.email}
                      </div>
                      <div className="text-[11px] text-[#5A6E68] truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          void handleUpdateUser(u, e.target.value as AuthRole, u.approved)
                        }
                        className="px-2 py-1 border border-[#DCE2DC] rounded-lg bg-white text-xs"
                      >
                        {(Object.keys(ROLE_LABELS) as AuthRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => void handleUpdateUser(u, u.role, !u.approved)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                          u.approved
                            ? "bg-[#ECF7F2] text-[#157A5B]"
                            : "bg-[#FDF1EC] text-[#C24620]"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {u.approved ? "Đã duyệt" : "Duyệt"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-medium text-[#4A5D58] mb-1">
                    Họ và tên / Đơn vị
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A - Đoàn xã Trà Linh"
                    className="w-full px-3 py-2 text-sm border border-[#DCE2DC] rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@duytan.edu.vn"
                  className="w-full px-3 py-2 text-sm border border-[#DCE2DC] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D58] mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#DCE2DC] rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#102824] hover:bg-[#193d37] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? "Đang xử lý..."
                  : mode === "signup"
                    ? "Tạo tài khoản (chờ Admin duyệt)"
                    : "Đăng nhập"}
              </button>
              <p className="text-[11px] text-[#5A6E68] leading-relaxed">
                Khách và Mạnh thường quân không cần đăng nhập vẫn có thể xem công khai Bản đồ nhu
                cầu và Báo cáo minh bạch.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
