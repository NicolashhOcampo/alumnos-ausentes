import { Bounce, ToastContainer } from 'react-toastify'
import './App.css'
import { PivotExcel } from './components/PivotExcel'

function App() {

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <PivotExcel />
    </>
  )
}

export default App
