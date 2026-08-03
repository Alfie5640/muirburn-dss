export default function ComplianceReport() {
    return (
        <div className="card">
            <h2>Compliance Report</h2>

            <p>Response from <code>/evaluate</code>.</p>

            <ul>
                <li>Season</li>
                <li>Slope</li>
                <li>Watercourse buffer</li>
                <li>Road buffer</li>
                <li>Native woodland</li>
                <li>Timing</li>
                <li>Notifications</li>
            </ul>
        </div>
    );
}