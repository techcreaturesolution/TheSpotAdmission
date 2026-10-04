import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <div className="font-display text-6xl font-bold text-brand-800">404</div>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you are looking for doesn't exist or was moved.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/" className="btn-primary">
          Go home
        </Link>
        <Link to="/institutions" className="btn-outline">
          Search institutions
        </Link>
      </div>
    </div>
  );
}
