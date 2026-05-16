export default function DetailItem({ label, value }) {
    return (
        <div className="projects-detail-item">
            <dt className="projects-detail-item__label">{label}</dt>
            <dd className="projects-detail-item__value">{value ?? '—'}</dd>
        </div>
    );
}
