import Header from './components/Header'
import StreamViewer from './components/StreamViewer'
import InfoCards from './components/InfoCards'
import HonkButton from './components/HonkButton'
import FactTicker from './components/FactTicker'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="container">
      <Header />
      <StreamViewer />
      <InfoCards />
      <HonkButton />
      <FactTicker />
      <Footer />
    </div>
  )
}
