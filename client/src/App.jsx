import axios from 'axios'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Route, Routes } from 'react-router-dom'
import { setUserData } from './redux/userSlice'
import Home from './pages/Home.jsx'
import Auth from './pages/Auth.jsx'

export const ServerUrl = 'http://localhost:8000'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const getUser = async () => {
      try {
        const result = await axios.get(`${ServerUrl}/api/user/current-user`, {
          withCredentials: true})
         dispatch(setUserData(result.data))
      } catch {
        dispatch(setUserData(null))
      }
    }

    getUser()
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/Auth" element={<Auth />} />
    </Routes>
  )
}

export default App