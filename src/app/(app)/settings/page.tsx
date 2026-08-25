'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleClearData = async () => {
    if (confirmation !== 'DELETE ALL DATA') {
      setError('Please type DELETE ALL DATA to confirm.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage('All data has been successfully cleared.');
        setConfirmation('');
      } else {
        setError(data.error || 'Failed to clear data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50 text-red-900 border-b border-red-100 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <p className="text-sm mt-1 text-red-700">Irreversible actions that affect your entire CRM.</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 max-w-md">
            <div>
              <h4 className="font-semibold text-lg text-gray-900">Clear All Data</h4>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete every lead and their entire message history. This action cannot be undone.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                To confirm, type <strong>DELETE ALL DATA</strong> below:
              </label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="border-red-200 focus-visible:ring-red-500"
              />
            </div>
            
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            {message && <p className="text-sm text-green-600 font-medium">{message}</p>}

            <Button 
              variant="danger" 
              onClick={handleClearData} 
              disabled={confirmation !== 'DELETE ALL DATA' || loading}
              className="mt-4"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {loading ? 'Deleting...' : 'Permanently Delete All Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Ensure CardDescription is exported in Card component, or I can just use <p>.
// Actually, I didn't export CardDescription in Card.tsx, so I replaced it with <p>.
