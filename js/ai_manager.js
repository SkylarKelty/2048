function AIManager(GameManager) {
	this.world = GameManager;
}

// Clones a grid's tiles into a simple cell array.
AIManager.prototype.simpleGridClone = function (grid) {
	var cells = [];
	for (var x = 0; x < grid.size; x++) {
		var row = cells[x] = [];
		for (var y = 0; y < grid.size; y++) {
			var tile = grid.cells[x][y];
			if (tile) {
				tile = tile.value;
			}
			row[y] = tile;
		}
	}
}

// Performs a fake movement on a grid.
AIManager.prototype.performMove = function (grid, direction) {
	var cells = this.simpleGridClone(grid);
	var newGrid = new Grid(grid.size, cells);
	var move = this.world.performMove(newGrid, direction);
	return {
		"result": move,
		"grid": newGrid
	};
}

// Grabs the score for a grid, with the given
// movement vector implemented.
AIManager.prototype.scoreMove = function (grid, direction) {
	var move = this.performMove(grid, direction);
	return move.result.score;
}

// Looks ahead, and grabs the highest score for
// any valid move, if the current move were to
// affect the grid.
AIManager.prototype.lookAhead = function (grid, direction, lookahead) {
	var world = this.performMove(grid, direction);
	var move = this.getMove(world.grid, 0, lookahead);
	return {
		"grid": world.grid,
		"score": move.score
	};
}

// Gets any direction we can move.
AIManager.prototype.getPossibleMoves = function (grid) {
	var self = this;
	var world = this.world;
	var moves = [0, 0, 0, 0];

	for (var x = 0; x < grid.size; x++) {
		for (var y = 0; y < grid.size; y++) {
			var tile = grid.cellContent({ x: x, y: y });
			if (tile) {
				for (var direction = 0; direction < 4; direction++) {
					var vector = world.getVector(direction);
					var cell   = { x: x + vector.x, y: y + vector.y };

					var other  = grid.cellContent(cell);
					if ((!other && grid.withinBounds(cell)) || (other && other.value == tile.value)) {
						moves[direction] = 1;
					}
				}
			}
		}
	}

	return moves;
}

// Gets any possible move.
AIManager.prototype.getDefaultMove = function (grid) {
	var moves = this.getPossibleMoves(grid);
	for (var direction = 0; direction < 4; direction++) {
		if (moves[direction]) {
			return direction;
		}
	}
	return -1;
}

// Gets the best possible move.
AIManager.prototype.getMove = function (grid, lookahead) {
	var self = this;
	var world = this.world;

	var score = 0;
	var dir = this.getDefaultMove(grid);

	var possibles = this.getPossibleMoves(grid);

	var algorithm = Math.floor(Math.random() * 100);
	var a1weight = 20;

	// Algorithm 1 - returns the move that will merge the
	// highest two tiles.
	if (algorithm < a1weight) {
		for (var x = 0; x < world.size; x++) {
			for (var y = 0; y < world.size; y++) {
				var tile = grid.cellContent({ x: x, y: y });

				if (tile) {
					for (var direction = 0; direction < 4; direction++) {
						var vector = world.getVector(direction);
						var cell   = { x: x + vector.x, y: y + vector.y };

						var other  = grid.cellContent(cell);

						if (other && other.value === tile.value) {
							if (tile.value * 2 > score) {
								score = tile * 2;
								dir = direction;
							}
						}
					}
				}
			}
		}
	}

	// Algorithm 2 - returns the move that will produce
	// the highest scoring world.
	if (algorithm >= a1weight) {
		for (var direction = 0; direction < 4; direction++) {
			if (possibles[direction]) {
				var possible = this.scoreMove(world.grid, direction);

				if (possible >= score) {
					score = possible;
					dir = direction;
				}
			}
		}
	}

	// Algorithm 3 - returns the move that will produce
	// the highest scoring round after the next {lookahead}
	// rounds.
	if (lookahead > 0) {
		var nextScore = 0;
		for (var direction = 0; direction < 4; direction++) {
			if (possibles[direction]) {
				var lookaheadMove = self.lookAhead(grid, direction, lookahead - 1);
				if (lookaheadMove.score > nextScore) {
					dir = direction;
					nextScore = lookaheadMove.score;
				}
			}
		}
	}

	return {
		"direction": dir,
		"score": score
	};
}

// Called every 1 second after the game has begun.
AIManager.prototype.tick = function () {
	var self = this;

	// Get the highest scoring move.
	var lookahead = Math.floor(Math.random() * 3);
	var move = this.getMove(this.world.grid, lookahead);
	var direction = move.direction;

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

// Learns after each game.
AIManager.prototype.onEnd = function () {
	// TODO
}
