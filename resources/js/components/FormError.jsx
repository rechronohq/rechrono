export default function FormError({ message }) {
    return message ? <p className="text-sm text-rose-600">{message}</p> : null;
}
