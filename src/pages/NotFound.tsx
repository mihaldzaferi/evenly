import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'

export function NotFound({ message = 'There’s nothing at this address.' }: { message?: string }) {
  return (
    <div className="card mx-auto max-w-md">
      <EmptyState icon={Compass} title="Not found">
        <p>{message}</p>
        <Link to="/" className="btn btn-primary mt-5">
          Go to your groups
        </Link>
      </EmptyState>
    </div>
  )
}
