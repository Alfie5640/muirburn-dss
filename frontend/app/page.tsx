import Header from "./components/Header";
import BurnMap from "./components/BurnMap";
import AssessmentForm from "./components/AssessmentForm";
import DetectionPanel from "./components/DetectionPanel";
import ComplianceReport from "./components/ComplianceReport";
import BurnReadiness from "./components/BurnReadiness";

export default function Home() {
    return (
        <main>

            <Header />

            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    margin: "20px",
                }}
            >
                <BurnMap />
                <AssessmentForm />
            </div>

            <DetectionPanel />

            <ComplianceReport />

            <BurnReadiness />

        </main>
    );
}