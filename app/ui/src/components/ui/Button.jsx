function Button({ children, className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export default Button;
