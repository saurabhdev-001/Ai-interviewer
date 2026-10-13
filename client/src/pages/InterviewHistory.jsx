import { useEffect, useState } from 'react'
import axios from 'axios'
import { ServerUrl } from '../App'

function InterviewHistory() {
    const [interviews, setInterviews] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                const result = await axios.get(`${ServerUrl}/api/interview/history`, {
                    withCredentials: true,
                })
                setInterviews(result.data.interviews)
            } catch (error) {
                console.error('Unable to load interview history:', error)
                setError('Unable to load your interview history. Please try again later.')
            } finally {
                setIsLoading(false)
            }
        }

        getMyInterviews()
    }, [])

    return (
        <main>
            <h1>Interview history</h1>
            {isLoading && <p>Loading interview history...</p>}
            {!isLoading && error && <p role="alert">{error}</p>}
            {!isLoading && !error && interviews.length === 0 && (
                <p>You have not completed any interviews yet.</p>
            )}
            {!isLoading && !error && interviews.length > 0 && (
                <ul>
                    {interviews.map((interview) => (
                        <li key={interview._id}>
                            <h2>{interview.role}</h2>
                            <p>
                                {interview.interviewType} interview · {interview.experience}
                            </p>
                            <p>Status: {interview.status.replaceAll('_', ' ')}</p>
                            {typeof interview.overallScore === 'number' && (
                                <p>Score: {interview.overallScore}/10</p>
                            )}
                            {interview.createdAt && (
                                <p>{new Date(interview.createdAt).toLocaleDateString()}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}

export default InterviewHistory
