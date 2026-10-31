import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p style={{ marginTop: '1rem' }}>
        <Link to="/">Go back home</Link>
      </p>
    </div>
  );
}
