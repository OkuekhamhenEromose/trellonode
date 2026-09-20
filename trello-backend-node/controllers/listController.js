const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');
const authorization = require('../services/authorizationService')

// Get all lists. When a board_id is supplied, authorization is resolved through the
// centralized board membership service before any list query is executed.
exports.getLists = async (req, res) => {
  try {
    const { board_id } = req.query;
    let query = {};

    if (board_id) {
      await authorization.requireBoardMember(board_id, req.user._id)
      query.board = board_id
    } else{
      // Without a board filter, scope the query to boards the authenticated user can
      // access. This keeps the result set tenant-safe without requiring one auth check
      // per returned list.
      const userBoards = await Board.find({
        $or: [
          { owner: req.user._id},
          {members: req.user._id}
        ],
        archived: false
      }).select('_id')
      query.board = { $in: userBoards.map((board) => board._id)}
    }

    const lists = await List.find(query)
      .sort('position')
      .populate('board')
      .populate({
        path: 'cards',
        match: { archived: false },
        options: { sort: { position: 1 } },
        populate: [
          {
            path: 'members',
            select: 'username email profile.fullname'
          }
        ]
      });

    return res.status(200).json(lists);
  } catch (error) {
    console.error('Get lists error:', error);
    if (error.status){
      return res.status(error.status).json({
        error: error.message,
        code: error.code || 'AUTHORIZATION_FAILED'
      })
    }
    return res.status(500).json({ error: 'Failed to fetch lists' });
  }
};

// Get a single list. The list-specific route middleware has already resolved the
// list's parent board and verified membership before the controller runs.
exports.getList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate("board")
      .populate({
        path: "cards",
        match: { archived: false },
        options: { sort: { position: 1 } },
        populate: [
          {
            path: "members",
            select: "username email profile.fullname",
          },
          {
            path: "comments",
            populate: {
              path: "author",
              select: "username email profile.fullname",
            },
          },
          {
            path: "checklists",
            populate: {
              path: "items",
            },
          },
        ],
      });

    // The authorization middleware is the security boundary. Keep this existence
    // check as a defensive guard because the document could disappear between the
    // authorization query and this retrieval query.
    if (!list) {
      return res.status(404).json({ error: "List not found", code: 'LIST_NOT_FOUND' });
    }
    return res.status(200).json(list)
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
};

// Create list
exports.createList = async (req, res) => {
  try {
    const { title, board, position } = req.body;

    // Check board access
    const boardDoc = await Board.findById(board);

    const list = await List.create({
      title,
      board,
      position
    });

    // Create activity
    await Activity.create({
      board: boardDoc._id,
      user: req.user._id,
      activity_type: 'CREATE',
      description: `${req.user.username} created list "${list.title}"`
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`board:${boardDoc._id}`).emit('list_created', list);

    return res.status(201).json(list);
  } catch (error) {
    console.error('Create list error:', error);
    return res.status(500).json({ error: 'Failed to create list' });
  }
};

// Update list. Authorization is based on the list's actual parent board, not on a
// caller-supplied board ID, preventing cross-board list modification.
exports.updateList = async (req, res) => {
  try {
    const list = req.list || await List.findById(req.params.id)

    if (!list) {
      return res.status(404).json({ error: 'List not found', code: 'LIST_NOT_FOUND' });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.position !== undefined) updates.position = req.body.position;

    const updatedList = await List.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Create activity
    await Activity.create({
      board: req.board._id,
      user: req.user._id,
      activity_type: 'UPDATE',
      description: `${req.user.username} updated list "${list.title}"`
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`board:${req.board._id}`).emit('list_updated', updatedList);

    return res.status(200).json(updatedList);
  } catch (error) {
    console.error('Update list error:', error);
    return res.status(500).json({ error: 'Failed to update list' });
  }
};

// Delete list. This is intentionally owner-only in the current Phase 9 policy.
exports.deleteList = async (req, res) => {
  try {
    const list = req.list || await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ error: 'List not found', code: 'LIST_NOT_FOUND' });
    }

    await List.findByIdAndDelete(req.params.id);

    // Create activity
    await Activity.create({
      board: list.board._id,
      user: req.user._id,
      activity_type: 'DELETE',
      description: `${req.user.username} deleted list "${list.title}"`
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`board:${list.board._id}`).emit('list_deleted', { listId: list._id });

    return res.status(200).json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    return res.status(500).json({ error: 'Failed to delete list' });
  }
};
