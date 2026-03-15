type FormFieldErrorProps = {
  message?: string;
};

export default function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p aria-live="polite" className="m-0 text-sm text-danger">
      {message}
    </p>
  );
}
