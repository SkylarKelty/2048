function AIManager(GameManager) {
	this.world = GameManager;
}

// Called when the game has begun.
AIManager.prototype.onStart = function () {
	this.tick();
}

// Called every 1 second after the game has begun.
AIManager.prototype.tick = function () {
	// Get a list of possible moves.
	var moves = this.getMoves();

	// Tick again in one second if the game isnt over yet.
	if (!this.world.isGameTerminated()) {
		window.setTimeout(this.tick, 1000);
	}
}