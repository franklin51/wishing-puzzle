Feature: Card progress and candle milestones
  The canvas experience should only allow valid card placements, track progress, and support full resets.

  Background:
    Given a fresh session with 27 cards available
    And no candles are lit on the cake

  Scenario: Placing the top card lights a candle and updates HUD
    When the user drags the top unplaced card onto the board
    Then that card is marked as placed
    And exactly one candle lights up
    And the HUD displays "1/27"

  Scenario: Only the top card can be dragged when others remain
    Given a second card remains in the stack
    When the user attempts to drag the second card
    Then the drag action is rejected
    And the candle count stays at 1

  Scenario: Resetting clears placement and candles
    Given one card is already placed
    And one candle is lit
    When the user resets the session
    Then all cards return to the unplaced stack
    And the candle count returns to 0
    And the HUD displays "0/27"

  # Acceptance Notes (Epic D3)
  # - Reject rapid successive drags that occur before the previous card settles.
  # - Reset flow must be safe to invoke at any time without throwing errors.
  # - Maintain performance headroom so drag/drop stays smooth under 60fps.
