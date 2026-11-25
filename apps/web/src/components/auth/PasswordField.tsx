import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getPasswordChecklist, validatePassword } from '../../lib/validators';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showRequirements?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
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
  name,
  autoComplete = 'new-password',
  required,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const checklist = getPasswordChecklist(value);
  const hasValue = value.length > 0;
  const allPassed = hasValue && checklist.every(c => c.passed);
  const showList = showRequirements && hasValue;
  const requirementsId = id ? `${id}-requirements` : 'password-requirements';

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} pr-10 ${showList && !allPassed ? 'border-amber-300 focus:border-amber-400' : ''}`}
          aria-describedby={showRequirements ? requirementsId : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showRequirements && (
        <ul id={requirementsId} className="space-y-1 text-xs">
          {checklist.map(item => {
            const passed = hasValue && item.passed;
            return (
              <li key={item.id} className={passed ? 'text-emerald-700' : hasValue ? 'text-rose-600' : 'text-slate-600'}>
                {passed ? '✓' : '○'} {item.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
