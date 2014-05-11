function AIManager(GameManager) {
	this.world = GameManager;
}

// Gets any possible move.
AIManager.prototype.getDefaultMove = function () {
	var self = this;
	var world = this.world;
	var grid = this.world.grid;

	for (var x = 0; x < grid.size; x++) {
		for (var y = 0; y < grid.size; y++) {
			var tile = grid.cellContent({ x: x, y: y });
			if (tile) {
				for (var direction = 0; direction < 4; direction++) {
					var vector = world.getVector(direction);
					var cell   = { x: x + vector.x, y: y + vector.y };

					var other  = grid.cellContent(cell);
					if (!other && grid.withinBounds(cell)) {
						return direction;
					}
				}
			}
		}
	}

	return -1;
}

// Gets the best possible move.
AIManager.prototype.getMove = function () {
	var world = this.world;

	var score = 0;
	var dir = this.getDefaultMove();

	for (var x = 0; x < world.size; x++) {
		for (var y = 0; y < world.size; y++) {
			var tile = world.grid.cellContent({ x: x, y: y });

			if (tile) {
				for (var direction = 0; direction < 4; direction++) {
					var vector = world.getVector(direction);
					var cell   = { x: x + vector.x, y: y + vector.y };

					var other  = world.grid.cellContent(cell);

					if (other && other.value === tile.value) {
						if (tile.value > score) {
							score = tile;
							dir = direction;
						}
					}
				}
			}
		}
	}

	return dir;
}

// Called every 1 second after the game has begun.
AIManager.prototype.tick = function () {
	var self = this;

	// Get the highest scoring move.
	var direction = this.getMove();

	// Perform the move or end the game.
	if (direction == -1) {
		return;
	}

	this.world.move(direction);

	// Tick again in one second if the game isnt over yet.
	if (!this.world.isGameTerminated()) {
		window.setTimeout(function() {
			self.tick();
		}, 200);
	}
}

// Called when the game has begun.
AIManager.prototype.onStart = function () {
	this.tick();
}