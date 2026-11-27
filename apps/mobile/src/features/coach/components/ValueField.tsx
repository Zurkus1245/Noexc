import { Controller, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@noexcuse/ui';
import { t } from '../../../shared/i18n';
import type { PlanControl, PlanFormValues } from '../lib/plan-form';

export interface ValueFieldProps extends Pick<TextFieldProps, 'keyboardType' | 'autoCapitalize' | 'multiline'> {
  readonly control: PlanControl;
  readonly name: Path<PlanFormValues>;
  readonly label: string;
}

// A text input bound to one plan field; invalid input shows the generic localized hint, never schema text.
export function ValueField({ control, name, label, ...inputProps }: ValueFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          value={String(field.value)}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error === undefined ? undefined : t('form.invalid')}
          {...inputProps}
        />
      )}
    />
  );
}
