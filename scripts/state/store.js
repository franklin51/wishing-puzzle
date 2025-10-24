export const DEFAULT_TOTAL_CARDS = 27;

export function createStore(options = {}) {
  const initialTotal = Number.isFinite(options.totalCards) ? options.totalCards : DEFAULT_TOTAL_CARDS;
  let state = freezeState({
    totalCards: Math.max(1, initialTotal),
    cards: createDeck(Math.max(1, initialTotal)),
    placedCount: 0,
    candlesLit: 0,
    activeCardId: null,
    progressText: `0/${Math.max(1, initialTotal)}`,
  });

  const listeners = new Set();

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setState(next) {
    state = freezeState(next);
    listeners.forEach((listener) => listener(state));
    return state;
  }

  function updateState(reducer) {
    const previous = state;
    const patch = reducer(previous) || {};
    const merged = {
      totalCards: normalizeTotal(patch.totalCards, previous.totalCards),
      cards: patch.cards ? cloneCards(patch.cards) : cloneCards(previous.cards),
      activeCardId: patch.hasOwnProperty('activeCardId') ? patch.activeCardId : previous.activeCardId,
      candlesLit: patch.hasOwnProperty('candlesLit') ? patch.candlesLit : undefined,
    };

    const normalized = normalizeState(merged);
    if (isStateEqual(previous, normalized)) {
      return state;
    }
    return setState(normalized);
  }

  function initializeDeck(totalCards = state.totalCards) {
    const normalizedTotal = normalizeTotal(totalCards, state.totalCards);
    return setState({
      totalCards: normalizedTotal,
      cards: createDeck(normalizedTotal),
      placedCount: 0,
      candlesLit: 0,
      activeCardId: null,
      progressText: `0/${normalizedTotal}`,
    });
  }

  function dragCard(cardId) {
    const currentState = state;
    if (currentState.activeCardId !== null && currentState.activeCardId !== cardId) {
      return { allowed: false, reason: 'another card is already active' };
    }

    const topCard = getTopUnplacedCard();
    if (!topCard) {
      return { allowed: false, reason: 'no cards left to drag' };
    }

    if (topCard.id !== cardId) {
      return { allowed: false, reason: 'only the top unplaced card is draggable' };
    }

    updateState((current) => {
      const nextCards = current.cards.map((card) =>
        card.id === cardId ? { ...card, status: 'dragging' } : card
      );
      return {
        cards: nextCards,
        activeCardId: cardId,
      };
    });

    return { allowed: true, cardId };
  }

  function placeCard(cardId) {
    const currentState = state;
    if (currentState.activeCardId !== cardId) {
      return { placed: false, reason: 'card must be active before placement' };
    }

    let wasAlreadyPlaced = false;
    updateState((current) => {
      const nextCards = current.cards.map((card) => {
        if (card.id !== cardId) return card;
        if (card.status === 'placed') {
          wasAlreadyPlaced = true;
          return card;
        }
        return { ...card, status: 'placed' };
      });
      return {
        cards: nextCards,
        activeCardId: null,
      };
    });

    if (wasAlreadyPlaced) {
      return { placed: true, alreadyPlaced: true };
    }

    return { placed: true };
  }

  function resetSession() {
    updateState((current) => {
      const nextCards = current.cards.map((card) => ({ ...card, status: 'unplaced' }));
      return {
        cards: nextCards,
        activeCardId: null,
        candlesLit: 0,
      };
    });
    return state;
  }

  function getTopUnplacedCard() {
    return state.cards.find((card) => card.status === 'unplaced');
  }

  function getProgressText() {
    return state.progressText;
  }

  return {
    initializeDeck,
    dragCard,
    placeCard,
    resetSession,
    getState,
    subscribe,
    getTopUnplacedCard,
    getProgressText,
  };
}

function createDeck(totalCards) {
  return Array.from({ length: totalCards }, (_, index) => ({
    id: index,
    status: 'unplaced',
  }));
}

function cloneCards(cards) {
  return cards.map((card) => ({ id: card.id, status: card.status }));
}

function normalizeTotal(requested, fallback) {
  if (Number.isFinite(requested) && requested > 0) return Math.floor(requested);
  return Math.max(1, fallback || DEFAULT_TOTAL_CARDS);
}

function normalizeState(draft) {
  const cards = draft.cards.map((card, index) => ({
    id: typeof card.id === 'number' ? card.id : index,
    status: card.status === 'placed' || card.status === 'dragging' ? card.status : 'unplaced',
  }));
  const placedCount = cards.filter((card) => card.status === 'placed').length;
  const totalCards = normalizeTotal(draft.totalCards, cards.length);
  const activeCardValid = cards.some((card) => card.id === draft.activeCardId && card.status === 'dragging');
  const activeCardId = activeCardValid ? draft.activeCardId : null;
  const candlesLit = draft.candlesLit ?? placedCount;

  return {
    totalCards,
    cards,
    placedCount,
    candlesLit,
    activeCardId,
    progressText: `${placedCount}/${totalCards}`,
  };
}

function freezeState(next) {
  const frozenCards = next.cards.map((card) => Object.freeze({ ...card }));
  return Object.freeze({
    ...next,
    cards: Object.freeze(frozenCards),
  });
}

function isStateEqual(previous, next) {
  if (previous === next) return true;
  if (!previous || !next) return false;
  if (previous.totalCards !== next.totalCards) return false;
  if (previous.placedCount !== next.placedCount) return false;
  if (previous.candlesLit !== next.candlesLit) return false;
  if (previous.activeCardId !== next.activeCardId) return false;
  if (previous.progressText !== next.progressText) return false;
  if (previous.cards.length !== next.cards.length) return false;
  for (let i = 0; i < previous.cards.length; i += 1) {
    const prevCard = previous.cards[i];
    const nextCard = next.cards[i];
    if (prevCard.id !== nextCard.id || prevCard.status !== nextCard.status) {
      return false;
    }
  }
  return true;
}
