export default function AssessmentForm() {
    return (
        <div className="card" style={{flex: 1}}>
            <h2>Practitioner Assessment</h2>

            <p>
                Manual information required before evaluating compliance.
            </p>

            <ul>
                <li>Burn date</li>
                <li>Burn time</li>
                <li>Slope</li>
                <li>Watercourse width</li>
                <li>Distances</li>
                <li>Peatland status</li>
                <li>Landowner notification</li>
                <li>SFRS region</li>
            </ul>

            <p>Submits assessment to <code>/evaluate</code>.</p>
        </div>
    );
}