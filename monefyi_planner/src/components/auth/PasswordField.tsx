import { getPasswordChecklist, validatePassword } from '../../lib/validators';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showRequirements?: boolean;
  className?: string;
  id?: string;
}

export function isPasswordReady(password: string) {
  return validatePassword(password).valid;
}

export default function PasswordField({
  value,
  onChange,
  placeholder = 'Password',
  showRequirements = true,
  className = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm',
  id,
}: PasswordFieldProps) {
  const checklist = getPasswordChecklist(value);
  const allPassed = checklist.every(c => c.passed);
  const showList = showRequirements && value.length > 0;

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className} ${showList && !allPassed ? 'border-amber-300 focus:border-amber-400' : ''}`}
        aria-describedby={showRequirements ? 'password-requirements' : undefined}
      />
      {showRequirements && (
        <ul id="password-requirements" className="space-y-1 text-xs">
          {checklist.map(item => (
            <li key={item.id} className={item.passed ? 'text-emerald-600' : value.length > 0 ? 'text-rose-600' : 'text-slate-600'}>
              {item.passed ? '✓' : '○'} {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
