import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { {{NAME_PASCAL}} } from './{{NAME_KEBAB}}';

/**
 * {{NAME_PASCAL}} Component Tests
 * Generated on {{DATE}}
 */
describe('{{NAME_PASCAL}}', () => {
  it('renders correctly', () => {
    render(<{{NAME_PASCAL}}>Test Content</{{NAME_PASCAL}}>);
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default variant and size classes', () => {
    const { container } = render(<{{NAME_PASCAL}}>Default</{{NAME_PASCAL}}>);
    const element = container.firstChild;
    
    expect(element).toHaveClass('bg-primary', 'text-primary-foreground', 'h-10');
  });

  it('applies secondary variant classes', () => {
    const { container } = render(
      <{{NAME_PASCAL}} variant="secondary">Secondary</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass('bg-secondary', 'text-secondary-foreground');
  });

  it('applies outline variant classes', () => {
    const { container } = render(
      <{{NAME_PASCAL}} variant="outline">Outline</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass('border', 'border-input');
  });

  it('applies small size classes', () => {
    const { container } = render(
      <{{NAME_PASCAL}} size="sm">Small</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass('h-8', 'px-3', 'text-sm');
  });

  it('applies large size classes', () => {
    const { container } = render(
      <{{NAME_PASCAL}} size="lg">Large</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass('h-12', 'py-3', 'px-6', 'text-lg');
  });

  it('handles disabled state', () => {
    const { container } = render(
      <{{NAME_PASCAL}} disabled>Disabled</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles loading state', () => {
    render(<{{NAME_PASCAL}} loading>Loading</{{NAME_PASCAL}}>);
    
    // Check for loading spinner
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('animate-spin');
  });

  it('applies custom className', () => {
    const customClass = 'custom-test-class';
    const { container } = render(
      <{{NAME_PASCAL}} className={customClass}>Custom</{{NAME_PASCAL}}>
    );
    const element = container.firstChild;
    
    expect(element).toHaveClass(customClass);
  });

  it('forwards additional props', () => {
    const testId = 'test-{{NAME_KEBAB}}';
    render(
      <{{NAME_PASCAL}} data-testid={testId}>Props Test</{{NAME_PASCAL}}>
    );
    
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('handles click events when not disabled', () => {
    const handleClick = jest.fn();
    render(
      <{{NAME_PASCAL}} onClick={handleClick}>Clickable</{{NAME_PASCAL}}>
    );
    
    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click events when disabled', () => {
    const handleClick = jest.fn();
    render(
      <{{NAME_PASCAL}} disabled onClick={handleClick}>
        Disabled Clickable
      </{{NAME_PASCAL}}>
    );
    
    fireEvent.click(screen.getByText('Disabled Clickable'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});