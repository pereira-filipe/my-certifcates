import { toast } from 'sonner'
import { t } from '@/i18n'

/** Copies text and shows a toast either way. */
export async function copyWithToast(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error(t('admin.copyFailed'))
  }
}
