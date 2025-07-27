import React, { useState, useEffect } from 'react';
import { User, MapPin, Save, X, Edit2 } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Select } from '../ui';
import { dashboardApi } from '../../services/dashboardApi';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  preferences: {
    currency: string;
    timezone: string;
    language: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

interface ProfileManagementProps {
  userId: string;
  onProfileUpdate?: (profile: ProfileData) => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ userId, onProfileUpdate }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getDetailedProfile();
      setProfile(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      // Transform the profile data to match API expectations
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        address: profile.address.street,
        city: profile.address.city,
        country: profile.address.country,
        postalCode: profile.address.postalCode,
      };
      await dashboardApi.updateProfile(updateData);
      setIsEditing(false);
      setError(null);
      onProfileUpdate?.(profile);
    } catch (err) {
      setError('Failed to save profile changes');
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile(); // Reload original data
  };

  const updateProfile = (field: string, value: any) => {
    if (!profile) return;
    
    const keys = field.split('.');
    const newProfile = { ...profile };
    let current: any = newProfile;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setProfile(newProfile);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Failed to load profile data</p>
          <Button onClick={fetchProfile} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold">Personal Information</h3>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <Input
                value={profile.firstName}
                onChange={(e) => updateProfile('firstName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <Input
                value={profile.lastName}
                onChange={(e) => updateProfile('lastName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => updateProfile('email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <Input
                value={profile.phone}
                onChange={(e) => updateProfile('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <Input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => updateProfile('dateOfBirth', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold">Address</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <Input
              value={profile.address.street}
              onChange={(e) => updateProfile('address.street', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <Input
                value={profile.address.city}
                onChange={(e) => updateProfile('address.city', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <Input
                value={profile.address.state}
                onChange={(e) => updateProfile('address.state', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Input
                value={profile.address.country}
                onChange={(e) => updateProfile('address.country', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <Input
                value={profile.address.postalCode}
                onChange={(e) => updateProfile('address.postalCode', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Preferences</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <Select
                value={profile.preferences.currency}
                onChange={(e) => updateProfile('preferences.currency', e.target.value)}
                disabled={!isEditing}
                options={[
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                  { value: 'CAD', label: 'CAD - Canadian Dollar' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <Select
                value={profile.preferences.timezone}
                onChange={(e) => updateProfile('preferences.timezone', e.target.value)}
                disabled={!isEditing}
                options={[
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'Eastern Time' },
                  { value: 'America/Chicago', label: 'Central Time' },
                  { value: 'America/Denver', label: 'Mountain Time' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time' },
                  { value: 'Europe/London', label: 'London' },
                  { value: 'Europe/Paris', label: 'Paris' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <Select
                value={profile.preferences.language}
                onChange={(e) => updateProfile('preferences.language', e.target.value)}
                disabled={!isEditing}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                  { value: 'it', label: 'Italian' }
                ]}
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-3">Notification Preferences</h4>
            <div className="space-y-3">
              {Object.entries(profile.preferences.notifications).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateProfile(`preferences.notifications.${key}`, e.target.checked)}
                    disabled={!isEditing}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {key === 'sms' ? 'SMS' : key} notifications
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProfileManagement;
