export default function DetectionPanel() {
    return (
        <div className="card">
            <h2>Detected Environmental Features</h2>

            <p>Response from <code>/detect</code>.</p>

            <ul>
                <li>Roads</li>
                <li>Watercourses</li>
                <li>Native woodland</li>
                <li>Bare peat</li>
            </ul>
        </div>
    );
}