<div class="ornament" aria-hidden="true">
  <span class="ornament__lozenge"></span>
</div>

<style>
  .ornament {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-accent);
  }

  .ornament::before,
  .ornament::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border-strong);
    opacity: 0.45;
  }

  .ornament__lozenge {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 1.5px;
    background: currentcolor;
    rotate: 45deg;
  }
</style>
