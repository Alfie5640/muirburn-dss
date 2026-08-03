export default function BurnMap() {
    return (
        <div className="card" style={{ flex: 2, minHeight: "500px" }}>
            <h2>Burn Area Selection</h2>

            <p>Interactive map (Leaflet) will be displayed here.</p>

            <ul>
                <li>Draw proposed burn polygon</li>
                <li>Edit or delete polygon</li>
                <li>Submit polygon to <code>/detect</code></li>
            </ul>
        </div>
    );
}