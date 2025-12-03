// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BudgetManager
 * @dev Manages budget allocation and initiatives for the DAO treasury
 */
contract BudgetManager is Ownable, ReentrancyGuard {
    // Budget structure for category-based allocation
    struct Budget {
        uint256 id;
        string category;
        uint256 allocated;
        uint256 spent;
        uint256 startDate;
        uint256 endDate;
        bool active;
    }

    // Initiative structure for funding requests
    struct Initiative {
        uint256 id;
        string name;
        string category;
        string description;
        uint256 requestedAmount;
        uint256 approvedAmount;
        address payable recipient;
        bool approved;
        bool funded;
        uint256 proposalId; // Link to TreasuryDAO proposal
        uint256 createdAt;
    }

    // State variables
    mapping(uint256 => Budget) public budgets;
    mapping(uint256 => Initiative) public initiatives;
    mapping(string => uint256[]) public budgetsByCategory;
    mapping(string => uint256[]) public initiativesByCategory;
    
    uint256 public budgetCount;
    uint256 public initiativeCount;
    
    address public treasuryDAO;

    // Supported budget categories
    string[] public categories;
    mapping(string => bool) public validCategory;

    // Events
    event BudgetCreated(
        uint256 indexed budgetId,
        string category,
        uint256 allocated,
        uint256 startDate,
        uint256 endDate
    );
    
    event BudgetUpdated(
        uint256 indexed budgetId,
        uint256 newAllocated
    );
    
    event BudgetClosed(uint256 indexed budgetId);
    
    event InitiativeProposed(
        uint256 indexed initiativeId,
        string name,
        string category,
        uint256 requestedAmount,
        address recipient
    );
    
    event InitiativeApproved(
        uint256 indexed initiativeId,
        uint256 approvedAmount
    );
    
    event InitiativeFunded(
        uint256 indexed initiativeId,
        uint256 amount
    );
    
    event CategoryAdded(string category);
    event TreasuryDAOUpdated(address newTreasuryDAO);

    /**
     * @dev Constructor - Initialize with default categories
     */
    constructor() {
        // Initialize default categories
        _addCategory("Development");
        _addCategory("Marketing");
        _addCategory("Operations");
        _addCategory("Community");
        _addCategory("Research");
        _addCategory("Security");
        _addCategory("Other");
    }

    /**
     * @dev Set TreasuryDAO contract address
     */
    function setTreasuryDAO(address _treasuryDAO) external onlyOwner {
        require(_treasuryDAO != address(0), "Invalid address");
        treasuryDAO = _treasuryDAO;
        emit TreasuryDAOUpdated(_treasuryDAO);
    }

    /**
     * @dev Add a new budget category
     */
    function addCategory(string memory category) external onlyOwner {
        _addCategory(category);
    }

    function _addCategory(string memory category) internal {
        require(!validCategory[category], "Category already exists");
        categories.push(category);
        validCategory[category] = true;
        emit CategoryAdded(category);
    }

    /**
     * @dev Create a new budget for a category
     */
    function createBudget(
        string memory category,
        uint256 allocated,
        uint256 durationDays
    ) external onlyOwner returns (uint256) {
        require(validCategory[category], "Invalid category");
        require(allocated > 0, "Allocated must be > 0");
        require(durationDays > 0, "Duration must be > 0");

        budgetCount++;
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + (durationDays * 1 days);

        budgets[budgetCount] = Budget({
            id: budgetCount,
            category: category,
            allocated: allocated,
            spent: 0,
            startDate: startDate,
            endDate: endDate,
            active: true
        });

        budgetsByCategory[category].push(budgetCount);

        emit BudgetCreated(budgetCount, category, allocated, startDate, endDate);
        return budgetCount;
    }

    /**
     * @dev Update budget allocation
     */
    function updateBudgetAllocation(
        uint256 budgetId,
        uint256 newAllocated
    ) external onlyOwner {
        require(budgetId > 0 && budgetId <= budgetCount, "Invalid budget ID");
        Budget storage budget = budgets[budgetId];
        require(budget.active, "Budget not active");
        require(newAllocated >= budget.spent, "Cannot reduce below spent");

        budget.allocated = newAllocated;
        emit BudgetUpdated(budgetId, newAllocated);
    }

    /**
     * @dev Close a budget period
     */
    function closeBudget(uint256 budgetId) external onlyOwner {
        require(budgetId > 0 && budgetId <= budgetCount, "Invalid budget ID");
        Budget storage budget = budgets[budgetId];
        require(budget.active, "Budget already closed");

        budget.active = false;
        emit BudgetClosed(budgetId);
    }

    /**
     * @dev Propose a new initiative
     */
    function proposeInitiative(
        string memory name,
        string memory category,
        string memory description,
        uint256 requestedAmount,
        address payable recipient
    ) external returns (uint256) {
        require(validCategory[category], "Invalid category");
        require(requestedAmount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(name).length > 0, "Name required");

        initiativeCount++;

        initiatives[initiativeCount] = Initiative({
            id: initiativeCount,
            name: name,
            category: category,
            description: description,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            recipient: recipient,
            approved: false,
            funded: false,
            proposalId: 0,
            createdAt: block.timestamp
        });

        initiativesByCategory[category].push(initiativeCount);

        emit InitiativeProposed(
            initiativeCount,
            name,
            category,
            requestedAmount,
            recipient
        );

        return initiativeCount;
    }

    /**
     * @dev Approve an initiative (called by owner or TreasuryDAO)
     */
    function approveInitiative(
        uint256 initiativeId,
        uint256 approvedAmount
    ) external {
        require(
            msg.sender == owner() || msg.sender == treasuryDAO,
            "Not authorized"
        );
        require(
            initiativeId > 0 && initiativeId <= initiativeCount,
            "Invalid initiative ID"
        );

        Initiative storage initiative = initiatives[initiativeId];
        require(!initiative.approved, "Already approved");
        require(approvedAmount > 0, "Amount must be > 0");
        require(
            approvedAmount <= initiative.requestedAmount,
            "Approved exceeds requested"
        );

        initiative.approved = true;
        initiative.approvedAmount = approvedAmount;

        emit InitiativeApproved(initiativeId, approvedAmount);
    }

    /**
     * @dev Link initiative to TreasuryDAO proposal
     */
    function linkToProposal(
        uint256 initiativeId,
        uint256 proposalId
    ) external {
        require(
            msg.sender == owner() || msg.sender == treasuryDAO,
            "Not authorized"
        );
        require(
            initiativeId > 0 && initiativeId <= initiativeCount,
            "Invalid initiative ID"
        );

        initiatives[initiativeId].proposalId = proposalId;
    }

    /**
     * @dev Mark initiative as funded and update budget spending
     */
    function markInitiativeFunded(
        uint256 initiativeId,
        uint256 budgetId
    ) external nonReentrant {
        require(
            msg.sender == owner() || msg.sender == treasuryDAO,
            "Not authorized"
        );
        require(
            initiativeId > 0 && initiativeId <= initiativeCount,
            "Invalid initiative ID"
        );

        Initiative storage initiative = initiatives[initiativeId];
        require(initiative.approved, "Not approved");
        require(!initiative.funded, "Already funded");

        // Update budget spending if budgetId provided
        if (budgetId > 0 && budgetId <= budgetCount) {
            Budget storage budget = budgets[budgetId];
            require(
                keccak256(bytes(budget.category)) == keccak256(bytes(initiative.category)),
                "Category mismatch"
            );
            require(budget.active, "Budget not active");
            require(
                budget.spent + initiative.approvedAmount <= budget.allocated,
                "Exceeds budget"
            );

            budget.spent += initiative.approvedAmount;
        }

        initiative.funded = true;

        emit InitiativeFunded(initiativeId, initiative.approvedAmount);
    }

    /**
     * @dev Get budget details
     */
    function getBudget(uint256 budgetId)
        external
        view
        returns (
            uint256 id,
            string memory category,
            uint256 allocated,
            uint256 spent,
            uint256 remaining,
            uint256 percentUsed,
            uint256 startDate,
            uint256 endDate,
            bool active
        )
    {
        require(budgetId > 0 && budgetId <= budgetCount, "Invalid budget ID");
        Budget storage budget = budgets[budgetId];

        uint256 _remaining = budget.allocated > budget.spent
            ? budget.allocated - budget.spent
            : 0;
        uint256 _percentUsed = budget.allocated > 0
            ? (budget.spent * 100) / budget.allocated
            : 0;

        return (
            budget.id,
            budget.category,
            budget.allocated,
            budget.spent,
            _remaining,
            _percentUsed,
            budget.startDate,
            budget.endDate,
            budget.active
        );
    }

    /**
     * @dev Get initiative details
     */
    function getInitiative(uint256 initiativeId)
        external
        view
        returns (
            uint256 id,
            string memory name,
            string memory category,
            string memory description,
            uint256 requestedAmount,
            uint256 approvedAmount,
            address recipient,
            bool approved,
            bool funded,
            uint256 proposalId,
            uint256 createdAt
        )
    {
        require(
            initiativeId > 0 && initiativeId <= initiativeCount,
            "Invalid initiative ID"
        );
        Initiative storage initiative = initiatives[initiativeId];

        return (
            initiative.id,
            initiative.name,
            initiative.category,
            initiative.description,
            initiative.requestedAmount,
            initiative.approvedAmount,
            initiative.recipient,
            initiative.approved,
            initiative.funded,
            initiative.proposalId,
            initiative.createdAt
        );
    }

    /**
     * @dev Get all budgets for a category
     */
    function getBudgetsByCategory(string memory category)
        external
        view
        returns (uint256[] memory)
    {
        return budgetsByCategory[category];
    }

    /**
     * @dev Get all initiatives for a category
     */
    function getInitiativesByCategory(string memory category)
        external
        view
        returns (uint256[] memory)
    {
        return initiativesByCategory[category];
    }

    /**
     * @dev Get all categories
     */
    function getCategories() external view returns (string[] memory) {
        return categories;
    }

    /**
     * @dev Get total allocated across all active budgets
     */
    function getTotalAllocated() external view returns (uint256 total) {
        for (uint256 i = 1; i <= budgetCount; i++) {
            if (budgets[i].active) {
                total += budgets[i].allocated;
            }
        }
        return total;
    }

    /**
     * @dev Get total spent across all budgets
     */
    function getTotalSpent() external view returns (uint256 total) {
        for (uint256 i = 1; i <= budgetCount; i++) {
            total += budgets[i].spent;
        }
        return total;
    }

    /**
     * @dev Get active budget for category
     */
    function getActiveBudgetForCategory(string memory category)
        external
        view
        returns (uint256 budgetId)
    {
        uint256[] memory categoryBudgets = budgetsByCategory[category];
        for (uint256 i = categoryBudgets.length; i > 0; i--) {
            uint256 id = categoryBudgets[i - 1];
            if (budgets[id].active && block.timestamp <= budgets[id].endDate) {
                return id;
            }
        }
        return 0; // No active budget found
    }
}
