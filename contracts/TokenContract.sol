//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

contract TokenContract {
    uint256 public constant VERSION = 100;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 public totalSupply;
    address public vault;
    address public owner;
    string public name;
    string public symbol;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        owner = _msgSender();
    }

    modifier onlyAdmin() {
        require(
            _msgSender() == owner,
            "Only the owner is able to do this operation."
        );
        _;
    }

    modifier onlyVault() {
        require(
            _msgSender() == vault,
            "Only Vault is able to do this operation."
        );
        _;
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return _balances[_owner];
    }

    function transfer(address to, uint256 value) public returns (bool) {
        address _owner = _msgSender();
        _transfer(_owner, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public returns (bool) {
        address spender = _msgSender();
        _transfer(from, to, value);
        _spendAllowance(from, spender, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        address _owner = _msgSender();
        _allowances[_owner][spender] = value;

        emit Approval(_owner, spender, value);

        return true;
    }

    function allowance(address _owner, address spender)
        public
        view
        returns (uint256)
    {
        return _allowances[_owner][spender];
    }

    function setVault(address _vault) public onlyAdmin {
        vault = _vault;
    }

    function mint(uint256 amount) external onlyVault returns (bool) {
        _balances[_msgSender()] += amount;
        totalSupply += amount;
        return true;
    }

    function burn(uint256 _amount, address _owner)
        external
        onlyVault
        returns (bool)
    {
        require(
            _amount <= _balances[_owner],
            "TokenContract::burn balance is not sufficient"
        );
        _balances[_owner] -= _amount;
        totalSupply -= _amount;
        return true;
    }

    function _spendAllowance(
        address _owner,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = allowance(_owner, spender);

        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "TokenContract: allowance from owner must be greater than amount"
            );
            _allowances[_owner][spender] -= amount;
        }
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {
        require(
            _balances[from] >= amount,
            "TokenContract: balance from owner must be greater than transfer amount"
        );
        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _msgSender() internal view returns (address) {
        return msg.sender;
    }
}
