import { useState } from 'react'

function App() {
  const [message, setMessage] = useState("");

  async function testBackend() {
    const res = await fetch("http://localhost:8080/api/challenges/test");
    const text = await res.text();
    setMessage(text);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Code & Conquer Frontend</h1>
      <button onClick={testBackend}>Test Backend</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
