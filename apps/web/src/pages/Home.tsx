export default function Home() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 Personal AI Assistant</h1>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        Welcome! The web interface is being built in Part 2.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Status</h2>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>✅ API Backend</li>
          <li>✅ Authentication</li>
          <li>✅ Event Management</li>
          <li>⏳ Full Web UI (Part 2)</li>
          <li>⏳ AI Chat Interface (Part 2)</li>
          <li>⏳ Calendar Integration (Part 2)</li>
        </ul>
      </div>
    </div>
  );
}
