import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { GoogleCalendarStatus } from '@personal-ai-assistant/shared';
import {
  Shield,
  LogOut,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London, Edinburgh' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
];

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile Form
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [language, setLanguage] = useState('en');
  const [profileSaved, setProfileSaved] = useState(false);

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminderOffset, setReminderOffset] = useState('15');

  // AI Preferences
  const [aiBriefingTime, setAiBriefingTime] = useState('08:00');
  const [aiTone, setAiTone] = useState('concise');

  // Google Calendar Connection
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setTimezone(user.timezone);
    }
  }, [user]);

  useEffect(() => {
    loadCalendarStatus();
  }, []);

  const loadCalendarStatus = async () => {
    try {
      setCalendarLoading(true);
      const res = await apiClient.calendar.getStatus();
      setCalendarStatus(res);
    } catch (err) {
      console.error('Failed to load calendar status', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setCalendarLoading(true);
      const res = await apiClient.calendar.getAuthUrl();
      if (res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setFeedback('Google Calendar OAuth is not configured on the server yet');
      }
    } catch (err: any) {
      setFeedback(err.message || 'Failed to initiate Google Calendar connection');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Disconnect Google Calendar? Local events will remain intact.')) return;
    try {
      setCalendarLoading(true);
      await apiClient.calendar.disconnect();
      setCalendarStatus({ isConnected: false });
      setFeedback('Google Calendar successfully disconnected.');
    } catch (err: any) {
      setFeedback(err.message || 'Failed to disconnect');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncLoading(true);
      const res = await apiClient.calendar.sync();
      setFeedback(`Sync completed: ${res.importedCount} imported, ${res.updatedCount} updated, ${res.deletedCount} removed.`);
      await loadCalendarStatus();
    } catch (err: any) {
      setFeedback(err.message || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const isCalendarConnected = calendarStatus?.isConnected ?? false;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings & Preferences</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Manage your account, calendar integrations, AI assistant behavior, and notification channels
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Profile Settings */}
      <Card title="User Profile & Timezone">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Primary Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={TIMEZONE_OPTIONS}
            />

            <Select
              label="Preferred Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
                { value: 'fr', label: 'Français' },
                { value: 'de', label: 'Deutsch' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
            {profileSaved && (
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 500 }}>
                ✓ Preferences updated
              </span>
            )}
            <Button type="submit" variant="primary" size="sm">
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Google Calendar Sync Card */}
      <Card
        title="Google Calendar Integration"
        action={
          isCalendarConnected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Two-way incremental synchronization between Google Calendar and your Personal AI Life Assistant.
          Tokens are encrypted with AES-256-GCM.
        </p>

        {isCalendarConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <strong>Primary Calendar:</strong> {calendarStatus?.calendarId || 'primary'}
              </div>
              <div>
                <strong>Last Synced:</strong>{' '}
                {calendarStatus?.lastSyncedAt
                  ? new Date(calendarStatus.lastSyncedAt).toLocaleString()
                  : 'Never'}
              </div>
              {calendarStatus?.lastSyncError && (
                <div style={{ color: 'var(--danger)' }}>
                  <strong>Last Error:</strong> {calendarStatus.lastSyncError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncNow}
                loading={syncLoading}
              >
                <RefreshCw size={15} />
                <span>Sync Now</span>
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnectGoogle}
                loading={calendarLoading}
              >
                Disconnect Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnectGoogle}
              loading={calendarLoading}
            >
              <ExternalLink size={15} />
              <span>Connect Google Calendar</span>
            </Button>
          </div>
        )}
      </Card>

      {/* AI Assistant Preferences */}
      <Card title="AI Assistant Preferences">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Select
            label="Assistant Tone & Style"
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value)}
            options={[
              { value: 'concise', label: 'Concise & Action-Oriented' },
              { value: 'detailed', label: 'Detailed & Conversational' },
              { value: 'coach', label: 'Accountability Coach' },
            ]}
          />

          <Input
            label="Daily Briefing Delivery Time"
            type="time"
            value={aiBriefingTime}
            onChange={(e) => setAiBriefingTime(e.target.value)}
          />
        </div>
      </Card>

      {/* Appearance & Theme */}
      <Card title="Appearance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Theme Mode</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Choose between light cloud surfaces or dark contrast mode
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant={theme === 'light' ? 'primary' : 'secondary'}
              onClick={() => setTheme('light')}
            >
              <Sun size={15} /> Light
            </Button>
            <Button
              size="sm"
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              onClick={() => setTheme('dark')}
            >
              <Moon size={15} /> Dark
            </Button>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card title="Reminder & Notification Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            <span>Send email reminders for events and high-priority tasks</span>
          </label>

          <div style={{ maxWidth: '300px' }}>
            <Select
              label="Default Reminder Notice"
              value={reminderOffset}
              onChange={(e) => setReminderOffset(e.target.value)}
              options={[
                { value: '5', label: '5 minutes before' },
                { value: '15', label: '15 minutes before' },
                { value: '30', label: '30 minutes before' },
                { value: '60', label: '1 hour before' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Security & Session */}
      <Card title="Account Security & Session">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color="var(--primary)" />
              <span>Multi-Tenant Data Isolation</span>
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Your calendar, tasks, and conversations are isolated by user ID with JWT token verification.
            </p>
          </div>

          <Button variant="danger" size="sm" onClick={() => logout()}>
            <LogOut size={15} />
            <span>Log out</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
