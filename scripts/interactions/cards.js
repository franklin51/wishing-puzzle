export function initCardInteractions(options) {
  const {
    canvas,
    store,
    cards,
    gridSize = 12,
    canInteract = () => true,
    onCardPlaced = () => {},
    onDragStateChange = () => {},
    drawScene,
  } = options;

  if (!canvas || !store || !cards || typeof drawScene !== 'function') {
    throw new Error('initCardInteractions requires canvas, store, cards, and drawScene.');
  }

  let dragging = null;

  function pointerDown(event) {
    if (!canInteract()) return;
    const pointer = getPointer(event, canvas);

    const topUnplaced = getTopUnplacedCard(cards);
    if (topUnplaced && containsCard(topUnplaced, pointer)) {
      const dragResult = store.dragCard(topUnplaced.id);
      if (!dragResult.allowed) {
        return;
      }
      dragging = {
        card: topUnplaced,
        dx: pointer.x - topUnplaced.x,
        dy: pointer.y - topUnplaced.y,
        fromStack: !topUnplaced.placed,
      };
      onDragStateChange('start', topUnplaced);
      drawScene();
      return;
    }

    const placedCard = hitPlacedCard(cards, pointer);
    if (placedCard) {
      dragging = {
        card: placedCard,
        dx: pointer.x - placedCard.x,
        dy: pointer.y - placedCard.y,
        fromStack: false,
      };
      onDragStateChange('start', placedCard);
      drawScene();
    }
  }

  function pointerMove(event) {
    if (!dragging) return;
    const pointer = getPointer(event, canvas);
    const card = dragging.card;
    card.x = pointer.x - dragging.dx;
    card.y = pointer.y - dragging.dy;
    drawScene();
  }

  function pointerUp() {
    if (!dragging) return;
    const card = dragging.card;

    if (dragging.fromStack) {
      const placedResult = finalizePlacement(card, store, gridSize);
      if (placedResult.placed) {
        card.placed = true;
        onCardPlaced(card);
      }
    } else {
      snapToGrid(card, gridSize);
    }

    raiseCardToTop(card, cards);
    dragging = null;
    onDragStateChange('end', card);
    drawScene();
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);

  function destroy() {
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
  }

  return { destroy };
}

function getPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getTopUnplacedCard(cards) {
  const unplaced = cards.filter((card) => !card.placed);
  if (!unplaced.length) return null;
  return unplaced.reduce((top, card) => (card.z > top.z ? card : top), unplaced[0]);
}

function hitPlacedCard(cards, pointer) {
  const candidates = cards.filter((card) => card.placed && containsCard(card, pointer));
  if (!candidates.length) return null;
  return candidates.reduce((top, card) => (card.z > top.z ? card : top), candidates[0]);
}

function containsCard(card, pointer) {
  return (
    pointer.x >= card.x &&
    pointer.x <= card.x + card.w &&
    pointer.y >= card.y &&
    pointer.y <= card.y + card.h
  );
}

function finalizePlacement(card, store, gridSize) {
  snapToGrid(card, gridSize);
  const result = store.placeCard(card.id);
  if (!result.placed) {
    return result;
  }
  return result;
}

function snapToGrid(card, gridSize) {
  card.x = Math.round(card.x / gridSize) * gridSize;
  card.y = Math.round(card.y / gridSize) * gridSize;
}

function raiseCardToTop(card, cards) {
  const maxZ = cards.reduce((max, entry) => Math.max(max, entry.z), 0);
  card.z = maxZ + 1;
}
