import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import Alert from "../ui/Alert";

const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
        if (!value.trim()) return "First name is required";
        break;
      case "lastName":
        if (!value.trim()) return "Last name is required";
        break;
      case "email":
        if (!value) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Email is invalid";
        break;
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8)
          return "Password must be at least 8 characters long";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
          return "Password must contain uppercase, lowercase letters and a number";
        break;
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        break;
      default:
        return "";
    }
    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await register(
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.password
    );
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setErrors({});
    } else {
      setErrors({ general: result.error });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate field on change for immediate feedback
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  if (success)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-pink-400 p-6">
        <div className="max-w-md w-full space-y-8 p-10 bg-gradient-to-r from-blue-400 to-indigo-700 rounded-3xl shadow-lg text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Account Created Successfully!
          </h2>
          <p className="text-gray-600">
            You can now sign in to start managing your finances.
          </p>
          <Button
            onClick={onSwitchToLogin}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-pink-400 p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {errors.general && (
            <Alert
              type="error"
              message={errors.general}
              onClose={() => setErrors({ ...errors, general: '' })}
            />
          )}

          <InputField
            label="First Name"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <InputField
            label="Last Name"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <InputField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />

          <Button
            type="submit"
            variant="gradient"
            size="xl"
            className="w-full h-16 text-xl font-bold mt-6"
            disabled={loading}
            loading={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          <p className="text-center text-base mt-6">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold hover:text-blue-700"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ label, name, type, value, onChange, error, required }) => (
  <div>
    <label
      htmlFor={name}
      className="block text-slate-700 font-semibold mb-2 text-base"
    >
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      aria-invalid={!!error}
      aria-describedby={`${name}-error`}
      className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base ${
        error ? "border-red-500 bg-red-50" : "border-slate-300 bg-slate-50 hover:bg-white focus:bg-white hover:border-slate-400"
      }`}
    />
    {error && (
      <Alert
        type="error"
        message={error}
        onClose={() => onChange({ target: { name, value: '' } })}
        className="mt-2"
      />
    )}
  </div>
);

export default Register;
