// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { EstimatorProvider, useEstimator } from './context';
import { PlannerScreen } from './screens/Planner';

afterEach(cleanup);

function PlannerFixture() {
  const { projects } = useEstimator();
  return <PlannerScreen project={projects[0]} />;
}

it('B4 | Planner mengubah target total pembeli menjadi RAP sesuai konfigurasi, bukan /1.18', async () => {
  const { container } = render(<EstimatorProvider host={{}}><PlannerFixture /></EstimatorProvider>);
  // Direct 100m, indirect 6m, contingency 4.24m, OH 8m, profit 7m, VAT 13.7764m.
  const sale = container.querySelector<HTMLInputElement>('#t-sellingPrice')!;
  fireEvent.change(sale, { target: { value: '139016400' } });
  await waitFor(() => expect(container.querySelector<HTMLInputElement>('#t-rap')?.value).toBe('110240000'));
});