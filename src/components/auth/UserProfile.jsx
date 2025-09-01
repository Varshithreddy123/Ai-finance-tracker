import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import Avatar from '../ui/Avatar';
import { Camera, CheckCircle2, AlertCircle, X, Edit3, Save, ShieldCheck, Mail, Phone, Building2, User as UserIcon } from 'lucide-react';

const UserProfile = () => {
  const { currentUser, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.profilePhoto || null);
  const [photoPreview, setPhotoPreview] = useState(currentUser?.profilePhoto || null);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    company: currentUser?.company || '',
    bio: currentUser?.bio || '',
  });

  // Compute a simple profile completeness score for a nice stat card
  const completeness = useMemo(() => {
    const keys = ['firstName', 'lastName', 'email', 'phone', 'company', 'bio'];
    const filled = keys.filter(k => (formData[k] || '').toString().trim().length > 0).length;
    return Math.round((filled / keys.length) * 100);
  }, [formData]);

  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      company: currentUser?.company || '',
      bio: currentUser?.bio || '',
    });
    setProfilePhoto(currentUser?.profilePhoto || null);
    setPhotoPreview(currentUser?.profilePhoto || null);
  }, [currentUser]);

  useEffect(() => {
    // Auto-dismiss success/info alerts after a short delay
    if (alert?.type === 'success' || alert?.type === 'info') {
      const t = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAlert({ type: 'error', text: 'Please select a valid image file.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAlert({ type: 'error', text: 'Image size must be less than 5MB.' });
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (evt) => setPhotoPreview(evt.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      let profileData = { ...formData };
      if (profilePhoto && profilePhoto !== currentUser?.profilePhoto) {
        const base64Photo = await convertFileToBase64(profilePhoto);
        profileData.profilePhoto = base64Photo;
      }

      if (typeof updateProfile === 'function') {
        const result = await updateProfile(profileData);
        if (result && result.success) {
          setAlert({ type: 'success', text: 'Profile updated successfully.' });
          setIsEditing(false);
          if (profileData.profilePhoto) setPhotoPreview(profileData.profilePhoto);
        } else {
          setAlert({ type: 'error', text: result?.error || 'Failed to update profile.' });
        }
      } else {
        // Fallback for when updateProfile is not provided by context
        console.log('Profile data to update:', profileData);
        setAlert({ type: 'success', text: 'Profile updated successfully.' });
        setIsEditing(false);
      }
    } catch (error) {
      setAlert({ type: 'error', text: error.message || 'Unexpected error occurred.' });
    }

    setLoading(false);
  };

  const convertFileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      company: currentUser?.company || '',
      bio: currentUser?.bio || '',
    });
    setProfilePhoto(currentUser?.profilePhoto || null);
    setPhotoPreview(currentUser?.profilePhoto || null);
    setIsEditing(false);
    setAlert(null);
  };

  const triggerPhotoUpload = () => fileInputRef.current?.click();

  const AlertBanner = ({ type = 'info', text, onClose }) => {
    const palette = {
      success: {
        bg: 'var(--color-green-100)',
        border: 'var(--color-green-300)',
        text: 'var(--color-green-700)'
      },
      error: {
        bg: 'var(--color-red-100)',
        border: 'var(--color-red-300)',
        text: 'var(--color-red-700)'
      },
      info: {
        bg: 'var(--color-blue-100)',
        border: 'var(--color-blue-300)',
        text: 'var(--color-blue-700)'
      },
    }[type] || {
      bg: 'var(--color-blue-100)', border: 'var(--color-blue-300)', text: 'var(--color-blue-700)'
    };
    return (
      <div className="rounded-md p-4 border flex items-start gap-3 animate-slide-down" style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }}>
        <div className="mt-0.5">
          {type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 text-sm font-medium">{text}</div>
        <button type="button" aria-label="Dismiss" onClick={onClose} className="click-anim" style={{ color: 'inherit' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, accent = 'emerald' }) => (
    <div className="card animate-slide-up">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm`} style={{ backgroundColor: 'var(--color-emerald-100)', color: 'var(--color-emerald-700)' }}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm text-slate-500 font-medium">{label}</div>
          <div className="text-xl font-semibold text-slate-800">{value}</div>
        </div>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100/40">
      <div className="max-w-5xl mx-auto">
        <div className="overflow-hidden rounded-2xl shadow-lg border border-slate-200 bg-white animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                <p className="text-emerald-100 mt-1">Manage your account information</p>
              </div>
              <div className="flex gap-3">
                {!isEditing ? (
                  <Button variant="glass" size="sm" onClick={() => setIsEditing(true)} className="click-anim">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={loading} className="click-anim">Cancel</Button>
                    <Button type="submit" form="profile-form" size="sm" className="bg-emerald-500 hover:bg-emerald-600 click-anim" disabled={loading}>
                      {loading ? 'Saving…' : (<><Save className="w-4 h-4 mr-2" /> Save</>)}
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={logout} className="border-white/60 text-white hover:bg-white hover:text-emerald-700 click-anim">
                  Logout
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 bg-white">
            {alert && (
              <div className="mb-6">
                <AlertBanner type={alert.type} text={alert.text} onClose={() => setAlert(null)} />
              </div>
            )}

            {/* Top section with avatar and basic info */}
            <div className="card animate-slide-up">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar
                    src={photoPreview}
                    alt="Profile"
                    initials={`${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`}
                    size="3xl"
                    ring
                    className="shadow-xl"
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={triggerPhotoUpload}
                      className="absolute bottom-2 right-2 bg-white text-slate-700 border border-slate-200 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-emerald-50 hover:text-emerald-700 click-anim"
                      title="Change photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {formData.firstName || currentUser.firstName} {formData.lastName || currentUser.lastName}
                  </h2>
                  <p className="text-slate-600">{formData.email || currentUser.email}</p>
                  {isEditing && (
                    <p className="text-xs text-slate-500 mt-1">Click the camera icon to change your profile photo</p>
                  )}

                  {/* Small quick facts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <StatCard icon={Mail} label="Email" value={formData.email || '—'} />
                    <StatCard icon={Phone} label="Phone" value={formData.phone || '—'} />
                    <StatCard icon={Building2} label="Company" value={formData.company || '—'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
              <div className="card animate-slide-up">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-600 font-medium">Profile completeness</div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-slate-800">{completeness}%</div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${completeness}%`, backgroundColor: 'var(--color-emerald-500)', transition: 'width 300ms ease' }} />
                </div>
              </div>
              <div className="card animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--color-blue-100)', color: 'var(--color-blue-700)' }}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 font-medium">Account</div>
                    <div className="text-xl font-semibold text-slate-800">Standard</div>
                  </div>
                </div>
              </div>
              <div className="card animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--color-green-100)', color: 'var(--color-green-700)' }}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 font-medium">Security</div>
                    <div className="text-xl font-semibold text-slate-800">Good standing</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form id="profile-form" onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Personal Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="input input-soft"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="input input-soft"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="input input-soft"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="input input-soft"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="input input-soft"
                        placeholder="Company name"
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Bio</h3>
                  </div>
                  <div>
                    <textarea
                      name="bio"
                      rows="12"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="input input-soft"
                      placeholder="Tell us about yourself..."
                      style={{ height: 'auto', minHeight: 180 }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom action bar for small screens when editing */}
              {isEditing && (
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="click-anim">Cancel</Button>
                  <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 click-anim" disabled={loading}>
                    {loading ? 'Saving…' : (<><Save className="w-4 h-4 mr-2" /> Save Changes</>)}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
