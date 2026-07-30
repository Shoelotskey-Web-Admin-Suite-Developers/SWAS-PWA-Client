import faviconSwas from '@/assets/icons/favicon-swas.svg'
import { NAV_ITEMS, PAGE_HEADER_META, type NavPage } from '@/constants/navigation'

type PageHeaderProps = {
  activePage: NavPage
}

export default function PageHeader({ activePage }: PageHeaderProps) {
  const page = PAGE_HEADER_META[activePage]
  const pageIcon = NAV_ITEMS.find(item => item.id === activePage)?.icon ?? 'bi-circle'
  const isOverlayHeader = activePage === 'serviceRequest' || activePage === 'payment'

  return (
    <header className={`pageHeader ${isOverlayHeader ? 'pageHeader--serviceRequest' : ''}`}>
      <img src={faviconSwas} alt="SWAS favicon" className="pageHeader-logo" />

      <div className="pageHeader-content" aria-label={page.title}>
        <div className="pageHeader-copy">
          <span className="pageHeader-title">{page.title}</span>
          <span className="pageHeader-subtitle">{page.subtitle}</span>
        </div>
        <i className={`${pageIcon} pageHeader-icon`} aria-hidden="true" />
      </div>
    </header>
  )
}