import { useParams } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export function CertificateDetailPage() {
  const { certificateId } = useParams()
  return <PlaceholderPage title={`Certificate ${certificateId}`} />
}
