import { useState } from "react";
import SWAS_Logo from "@/assets/images/SWAS-Logo-Large.png";
import BG_PATTERN from "@/assets/images/bg-pattern.png";
import "@/styles/login.css";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/utils/api/auth"; // 🔑 import login API
import { toast, Toaster } from "sonner"; // ✅ import Sonner

// ✅ Accept onLogin prop from App.tsx
type LoginProps = {
  onLogin: (user: { user_id: string; branch_id: string; position: string }) => void;
};

function Login({ onLogin }: LoginProps) {
  const [form, setForm] = useState({
    userId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await loginUser(form.userId, form.password);

      // Store token and user info
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user_id", data.user.user_id);
      sessionStorage.setItem("branch_id", data.user.branch_id);
      sessionStorage.setItem("position", data.user.position);

      toast.success("Login successful!"); // ✅ toast success
      onLogin(data.user); // notify App.tsx
    } catch (err: any) {
      toast.error(err.message || "Login failed"); // ✅ toast error
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Toaster at bottom-center */}
      <Toaster position="top-center" richColors />

      <div
        className="login-container"
        style={{ backgroundImage: `url(${BG_PATTERN})` }}
      >
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-content">
            <div className="logo-wrapper">
              <img src={SWAS_Logo} alt="Shoelotskey Logo" className="logo" />
            </div>

            <div className="input-wrapper">
              <InputField label="User ID" htmlFor="userId">
                <Input
                  id="userId"
                  value={form.userId}
                  onChange={(e) => handleChange("userId", e.target.value)}
                  required
                />
              </InputField>

              <InputField label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </InputField>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "LOG IN"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default Login;

// 🔁 Reusable field wrapper
type InputFieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

function InputField({ label, htmlFor, children }: InputFieldProps) {
  return (
    <div className="input-container login-input">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
