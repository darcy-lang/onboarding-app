import { useState, useEffect, useRef } from 'react';
import { VIDEOS } from '../data.js';

const VIDEO_IDS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];

export default function VideoUploadPanel() {
  const [videoUrls, setVideoUrls] = useState({});
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loomInputs, setLoomInputs] = useState({});
  const [showLoom, setShowLoom] = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    fetch('/api/videos', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setVideoUrls(data.videos || {}));
  }, []);

  const handleUpload = async (videoId, file) => {
    setError('');
    setSuccess('');
    setUploading(videoId);

    const formData = new FormData();
    formData.append('video_id', videoId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setUploading(null); return; }
      setVideoUrls(p => ({ ...p, [videoId]: data.url }));
      setSuccess(`${VIDEOS[videoId].title} uploaded successfully`);
    } catch {
      setError('Upload failed. Check file size (max 500MB).');
    }
    setUploading(null);
  };

  const saveLoom = async (videoId) => {
    const url = (loomInputs[videoId] || '').trim();
    if (!url) return;
    setError('');
    setSuccess('');
    setUploading(videoId);

    try {
      const res = await fetch('/api/videos/loom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ video_id: videoId, loom_url: url })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); setUploading(null); return; }
      setVideoUrls(p => ({ ...p, [videoId]: data.url }));
      setSuccess(`${VIDEOS[videoId].title} — Loom link saved`);
      setShowLoom(p => ({ ...p, [videoId]: false }));
      setLoomInputs(p => ({ ...p, [videoId]: '' }));
    } catch {
      setError('Failed to save Loom link.');
    }
    setUploading(null);
  };

  const isLoom = (url) => url && (url.includes('loom.com'));

  return (
    <div>
      {error && <div style={{ background: '#1A0A0A', border: '1px solid #5A2020', borderRadius: 10, padding: '10px 14px', color: '#E07B6A', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ background: '#0A1A10', border: '1px solid #205A30', borderRadius: 10, padding: '10px 14px', color: '#6BAE94', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {VIDEO_IDS.map(id => {
          const v = VIDEOS[id];
          const url = videoUrls[id];
          const isUploading = uploading === id;
          const loom = isLoom(url);

          return (
            <div key={id} style={{ background: '#0D0C10', border: `1px solid ${url ? '#6BAE9430' : '#1A1820'}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#3A3040', fontWeight: 700 }}>{id.toUpperCase()}</span>
                    <span style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 600 }}>{v.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#3A3040' }}>{v.duration}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {url ? (
                    <>
                      <div style={{ fontSize: 12, color: '#6BAE94', fontWeight: 600 }}>{loom ? '✓ Loom' : '✓ Uploaded'}</div>
                      <a href={loom ? url : url} target="_blank" rel="noopener noreferrer" style={{ background: '#6BAE9420', border: '1px solid #6BAE9440', color: '#6BAE94', borderRadius: 8, padding: '6px 12px', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>Watch</a>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#D4A853' }}>Not added</div>
                  )}

                  <button
                    onClick={() => setShowLoom(p => ({ ...p, [id]: !p[id] }))}
                    style={{ background: '#9B7EC820', border: '1px solid #9B7EC840', color: '#9B7EC8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Loom Link
                  </button>

                  <input
                    ref={el => fileRefs.current[id] = el}
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleUpload(id, e.target.files[0]); e.target.value = ''; }}
                  />
                  <button
                    onClick={() => fileRefs.current[id]?.click()}
                    disabled={isUploading}
                    style={{
                      background: isUploading ? '#1A1820' : (url ? '#2A2430' : '#D4A853'),
                      color: isUploading ? '#3A3040' : (url ? '#6A6070' : '#09080A'),
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isUploading ? 'default' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isUploading ? 'Saving...' : (url ? 'Replace File' : 'Upload File')}
                  </button>
                </div>
              </div>

              {showLoom[id] && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input
                    value={loomInputs[id] || ''}
                    onChange={e => setLoomInputs(p => ({ ...p, [id]: e.target.value }))}
                    placeholder="Paste Loom link here (e.g. https://www.loom.com/share/...)"
                    style={{ flex: 1, background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EEE5D5', outline: 'none' }}
                  />
                  <button
                    onClick={() => saveLoom(id)}
                    disabled={isUploading || !(loomInputs[id] || '').trim()}
                    style={{ background: '#9B7EC8', color: '#09080A', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >
                    Save
                  </button>
                </div>
              )}

              <div style={{ fontSize: 12, color: '#4A4050', marginTop: 8, lineHeight: 1.6 }}>
                📽 {v.brief}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
